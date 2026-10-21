import "server-only";
import { and, count, desc, eq, max } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { labSessions, scenarioEvents, scenarioVersions, scenarios } from "@/server/db/schema";
import type { ScenarioDefinition } from "@/content/scenario-schema";
import {
  applyAction,
  applyResolution,
  closeTicket,
  initialState,
  publicView,
  submitDiagnosis,
  useHint,
  type LabReport,
  type LabState,
} from "@/server/engines/scenario-engine";
import { ForbiddenError } from "@/server/authz/policies";
import { getUserTier } from "./entitlements";
import { recordEvidence } from "./skills";
import { awardBadge, awardXp } from "./xp";

export type LabEvent = { seq: number; type: string; refId: string; payload: Record<string, unknown>; createdAt: Date };

async function loadSession(db: Db, userId: string, sessionId: string) {
  const [row] = await db
    .select({ session: labSessions, definition: scenarioVersions.definition, scenarioSlug: scenarios.slug })
    .from(labSessions)
    .innerJoin(scenarioVersions, eq(scenarioVersions.id, labSessions.scenarioVersionId))
    .innerJoin(scenarios, eq(scenarios.id, scenarioVersions.scenarioId))
    .where(eq(labSessions.id, sessionId))
    .limit(1);
  // Protection IDOR : une session de labo n'est accessible qu'à son propriétaire.
  if (!row || row.session.userId !== userId) throw new ForbiddenError("Ce laboratoire n'existe pas ou ne vous appartient pas.");
  return { ...row, definition: row.definition as ScenarioDefinition };
}

async function appendEvent(db: Db, sessionId: string, type: "action" | "hint" | "diagnosis" | "resolution" | "close", refId: string, payload: Record<string, unknown>) {
  const [{ m }] = await db.select({ m: max(scenarioEvents.seq) }).from(scenarioEvents).where(eq(scenarioEvents.labSessionId, sessionId));
  await db.insert(scenarioEvents).values({ labSessionId: sessionId, seq: (m ?? 0) + 1, type, refId, payload });
}

/** Reprend l'incident en cours ou en démarre un nouveau sur la dernière version du scénario. */
export async function startLab(userId: string, scenarioSlug: string, opts: { restart?: boolean } = {}, db: Db = getDb()) {
  const [sc] = await db.select().from(scenarios).where(and(eq(scenarios.slug, scenarioSlug), eq(scenarios.status, "published"))).limit(1);
  if (!sc || !sc.currentVersionId) throw new ForbiddenError("Scénario introuvable.");
  const tier = await getUserTier(userId, db);
  if (tier < sc.requiredTier) throw new ForbiddenError("Ce laboratoire fait partie d'une offre supérieure.");
  const [active] = await db
    .select({ id: labSessions.id, scenarioVersionId: labSessions.scenarioVersionId })
    .from(labSessions)
    .innerJoin(scenarioVersions, eq(scenarioVersions.id, labSessions.scenarioVersionId))
    .where(and(eq(labSessions.userId, userId), eq(scenarioVersions.scenarioId, sc.id), eq(labSessions.status, "active")))
    .orderBy(desc(labSessions.startedAt))
    .limit(1);
  if (active && !opts.restart) return active.id;
  if (active) await db.update(labSessions).set({ status: "abandoned", endedAt: new Date() }).where(eq(labSessions.id, active.id));
  const [v] = await db.select().from(scenarioVersions).where(eq(scenarioVersions.id, sc.currentVersionId));
  const [row] = await db
    .insert(labSessions)
    .values({ userId, scenarioVersionId: v.id, state: initialState(v.definition as ScenarioDefinition) })
    .returning({ id: labSessions.id });
  return row.id;
}

export async function getLabView(userId: string, sessionId: string, db: Db = getDb()) {
  const { session, definition, scenarioSlug } = await loadSession(db, userId, sessionId);
  const events = await db
    .select({ seq: scenarioEvents.seq, type: scenarioEvents.type, refId: scenarioEvents.refId, payload: scenarioEvents.payload, createdAt: scenarioEvents.createdAt })
    .from(scenarioEvents)
    .where(eq(scenarioEvents.labSessionId, sessionId))
    .orderBy(scenarioEvents.seq);
  const closed = session.status === "closed";
  return {
    sessionId,
    scenarioSlug,
    status: session.status,
    view: publicView(definition, session.state),
    events: events as LabEvent[],
    report: closed ? (session.report as LabReport) : null,
    debrief: closed ? definition.debrief : null,
    hintsAvailable: definition.hints.length - session.state.hintsUsed,
    inPortfolio: session.inPortfolio,
  };
}
export type LabViewData = Awaited<ReturnType<typeof getLabView>>;

type Step =
  | { kind: "action"; actionId: string; confirmRisk?: boolean }
  | { kind: "diagnosis"; diagnosisId: string }
  | { kind: "resolution"; resolutionId: string }
  | { kind: "hint" };

/**
 * Exécute une étape. L'état est verrouillé (SELECT … FOR UPDATE) pour qu'un double clic
 * ou deux onglets ne produisent jamais d'état incohérent.
 */
export async function labStep(userId: string, sessionId: string, step: Step, db: Db = getDb()) {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    await tx.select({ id: labSessions.id }).from(labSessions).where(eq(labSessions.id, sessionId)).for("update");
    const { session, definition } = await loadSession(t, userId, sessionId);
    if (session.status !== "active") throw new ForbiddenError("Ce ticket est déjà clôturé.");
    let state: LabState = session.state;
    let payload: Record<string, unknown> = {};
    let type: "action" | "hint" | "diagnosis" | "resolution";
    let refId: string;
    if (step.kind === "action") {
      const action = definition.actions.find((a) => a.id === step.actionId);
      if (action?.risk?.level === "dangerous" && !step.confirmRisk) {
        return { needsConfirmation: true as const, risk: action.risk, label: action.label };
      }
      const r = applyAction(definition, state, step.actionId);
      state = r.state;
      payload = { ...r.result };
      type = "action";
      refId = step.actionId;
    } else if (step.kind === "diagnosis") {
      const r = submitDiagnosis(definition, state, step.diagnosisId);
      state = r.state;
      payload = { correct: r.correct, feedback: r.feedback, label: definition.diagnoses.find((d) => d.id === step.diagnosisId)?.label };
      type = "diagnosis";
      refId = step.diagnosisId;
    } else if (step.kind === "resolution") {
      const r = applyResolution(definition, state, step.resolutionId);
      state = r.state;
      payload = { correct: r.correct, feedback: r.feedback, label: definition.resolutions.find((d) => d.id === step.resolutionId)?.label };
      type = "resolution";
      refId = step.resolutionId;
    } else {
      const r = useHint(definition, state);
      state = r.state;
      payload = { hint: r.hint, level: r.level };
      type = "hint";
      refId = `hint-${r.level}`;
    }
    await tx.update(labSessions).set({ state }).where(eq(labSessions.id, sessionId));
    await appendEvent(t, sessionId, type, refId, payload);
    return { needsConfirmation: false as const };
  });
}

export async function closeLab(userId: string, sessionId: string, closingNote: string, db: Db = getDb()) {
  const note = closingNote.trim().slice(0, 4000);
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    await tx.select({ id: labSessions.id }).from(labSessions).where(eq(labSessions.id, sessionId)).for("update");
    const { session, definition } = await loadSession(t, userId, sessionId);
    if (session.status !== "active") throw new ForbiddenError("Ce ticket est déjà clôturé.");
    const { state, report } = closeTicket(definition, session.state, note);
    await tx.update(labSessions).set({ state, report, score: report.score, status: "closed", endedAt: new Date() }).where(eq(labSessions.id, sessionId));
    await appendEvent(t, sessionId, "close", "close", { score: report.score });
    await recordEvidence(
      t,
      userId,
      "scenario",
      session.scenarioVersionId,
      Object.entries(report.skillScores).map(([skillCode, score]) => ({ skillCode, score })),
    );
    await awardXp(t, userId, "scenario_closed", session.scenarioVersionId);
    await awardBadge(t, userId, "premier-incident");
    if (report.keyActionsMissed.length === 0 && session.state.hintsUsed === 0 && report.resolved) await awardBadge(t, userId, "methodique");
    const [{ n }] = await t
      .select({ n: count() })
      .from(labSessions)
      .where(and(eq(labSessions.userId, userId), eq(labSessions.status, "closed")));
    if (n >= 5) {
      const risky = await t.select({ report: labSessions.report }).from(labSessions).where(and(eq(labSessions.userId, userId), eq(labSessions.status, "closed")));
      if (risky.every((r) => !(r.report as LabReport | null)?.dangerousActions.length)) await awardBadge(t, userId, "zero-risque");
    }
    return report;
  });
}

export async function setLabInPortfolio(userId: string, sessionId: string, inPortfolio: boolean, db: Db = getDb()) {
  const { session } = await loadSession(db, userId, sessionId);
  if (session.status !== "closed") throw new ForbiddenError("Seul un incident clôturé peut rejoindre votre portfolio.");
  await db.update(labSessions).set({ inPortfolio }).where(eq(labSessions.id, sessionId));
}

export async function getLabHistory(userId: string, db: Db = getDb()) {
  return db
    .select({ id: labSessions.id, slug: scenarios.slug, title: scenarios.title, status: labSessions.status, score: labSessions.score, startedAt: labSessions.startedAt, endedAt: labSessions.endedAt, inPortfolio: labSessions.inPortfolio })
    .from(labSessions)
    .innerJoin(scenarioVersions, eq(scenarioVersions.id, labSessions.scenarioVersionId))
    .innerJoin(scenarios, eq(scenarios.id, scenarioVersions.scenarioId))
    .where(eq(labSessions.userId, userId))
    .orderBy(desc(labSessions.startedAt));
}

/** Session active (ou dernière clôturée) d'un apprenant pour un scénario donné. */
export async function findLabSessions(userId: string, scenarioSlug: string, db: Db = getDb()) {
  return db
    .select({ id: labSessions.id, status: labSessions.status, score: labSessions.score, startedAt: labSessions.startedAt, endedAt: labSessions.endedAt })
    .from(labSessions)
    .innerJoin(scenarioVersions, eq(scenarioVersions.id, labSessions.scenarioVersionId))
    .innerJoin(scenarios, eq(scenarios.id, scenarioVersions.scenarioId))
    .where(and(eq(labSessions.userId, userId), eq(scenarios.slug, scenarioSlug)))
    .orderBy(desc(labSessions.startedAt));
}

export async function getScenarioBriefing(slug: string, db: Db = getDb()) {
  const [row] = await db
    .select({ scenario: scenarios, definition: scenarioVersions.definition })
    .from(scenarios)
    .innerJoin(scenarioVersions, eq(scenarioVersions.id, scenarios.currentVersionId))
    .where(and(eq(scenarios.slug, slug), eq(scenarios.status, "published")))
    .limit(1);
  if (!row) return null;
  const def = row.definition as ScenarioDefinition;
  return { ...row.scenario, company: def.company, ticket: def.ticket, estimatedMinutes: def.estimatedMinutes, skills: def.skills };
}
