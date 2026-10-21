import "server-only";
import { and, desc, eq, gte, inArray, isNull, notInArray } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import {
  attestations,
  consentRecords,
  interviewAnswers,
  interviewQuestions,
  interviewSessions,
  jobAnalyses,
  labSessions,
  lessonProgress,
  lessons,
  scenarioVersions,
  scenarios,
  skillPassports,
  user,
} from "@/server/db/schema";
import { gradeText, type RubricResult } from "@/server/engines/rubric";
import { analyzeJobOffer } from "@/server/engines/job-offer";
import type { InterviewRubric } from "@/content/career-schema";
import type { LabReport } from "@/server/engines/scenario-engine";
import { ForbiddenError } from "@/server/authz/policies";
import { getUserTier } from "./entitlements";
import { getSkillMap } from "./skills";
import { recordEvidence } from "./skills";
import { awardBadge, awardXp } from "./xp";
import { randomCode } from "@/lib/codes";

export class CareerError extends Error {}

/* ---------------------------------------------------------------- Analyse d'offre */

export async function analyzeOffer(userId: string, input: { title: string; offerText: string; interviewDate: string | null }, db: Db = getDb()) {
  const [map, lessonRows, scenarioRows, done] = await Promise.all([
    getSkillMap(userId, db),
    db.select({ slug: lessons.slug, title: lessons.title }).from(lessons),
    db.select({ slug: scenarios.slug, title: scenarios.title }).from(scenarios),
    db.select({ slug: lessons.slug }).from(lessonProgress).innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId)).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"))),
  ]);
  const interviewDate = input.interviewDate ? new Date(`${input.interviewDate}T09:00:00`) : null;
  const result = analyzeJobOffer(input.offerText, {
    skillLevels: Object.fromEntries(map.skills.map((s) => [s.code, { level: s.level, confident: s.confident }])),
    lessonTitles: Object.fromEntries(lessonRows.map((l) => [l.slug, l.title])),
    scenarioTitles: Object.fromEntries(scenarioRows.map((s) => [s.slug, s.title])),
    completedLessons: new Set(done.map((d) => d.slug)),
    interviewDate,
  });
  const [row] = await db
    .insert(jobAnalyses)
    .values({ userId, title: input.title.slice(0, 160), offerText: input.offerText.slice(0, 20000), result, interviewDate: input.interviewDate })
    .returning({ id: jobAnalyses.id });
  return row.id;
}

export async function getJobAnalysis(userId: string, id: string, db: Db = getDb()) {
  const [row] = await db.select().from(jobAnalyses).where(eq(jobAnalyses.id, id)).limit(1);
  if (!row || row.userId !== userId) throw new ForbiddenError("Cette analyse n'existe pas ou ne vous appartient pas.");
  return row;
}

export async function listJobAnalyses(userId: string, db: Db = getDb()) {
  return db.select({ id: jobAnalyses.id, title: jobAnalyses.title, createdAt: jobAnalyses.createdAt, interviewDate: jobAnalyses.interviewDate }).from(jobAnalyses).where(eq(jobAnalyses.userId, userId)).orderBy(desc(jobAnalyses.createdAt)).limit(20);
}

export async function deleteJobAnalysis(userId: string, id: string, db: Db = getDb()) {
  await getJobAnalysis(userId, id, db);
  await db.delete(jobAnalyses).where(eq(jobAnalyses.id, id));
}

/* ---------------------------------------------------------------- Simulateur d'entretien */

export const FREE_INTERVIEWS_PER_30_DAYS = 1;
const QUESTIONS_BY_DURATION: Record<number, number> = { 15: 4, 30: 7, 45: 10 };

export type InterviewOptions = {
  role: string;
  level: "debutant" | "intermediaire" | "avance";
  sector: string;
  kind: "rh" | "technique" | "mixte";
  lang: "fr" | "en";
  durationMin: 15 | 30 | 45;
};

export async function interviewQuota(userId: string, db: Db = getDb()) {
  const tier = await getUserTier(userId, db);
  if (tier >= 2) return { unlimited: true, remaining: Infinity };
  const since = new Date(Date.now() - 30 * 86_400_000);
  const used = await db.select({ id: interviewSessions.id }).from(interviewSessions).where(and(eq(interviewSessions.userId, userId), gte(interviewSessions.startedAt, since)));
  return { unlimited: false, remaining: Math.max(0, FREE_INTERVIEWS_PER_30_DAYS - used.length) };
}

export async function startInterview(userId: string, opts: InterviewOptions, db: Db = getDb()) {
  const quota = await interviewQuota(userId, db);
  if (!quota.unlimited && quota.remaining <= 0) {
    throw new CareerError("Votre simulation gratuite de ce mois est utilisée. L'offre Academy Pro donne accès aux simulations illimitées.");
  }
  const wanted = QUESTIONS_BY_DURATION[opts.durationMin] ?? 4;
  const kinds = opts.kind === "mixte" ? ["rh", "technique", "situation"] : opts.kind === "technique" ? ["technique", "situation"] : ["rh", "situation"];
  // Éviter de reposer les questions déjà travaillées lors des dernières sessions.
  const recent = await db
    .select({ q: interviewAnswers.questionId })
    .from(interviewAnswers)
    .innerJoin(interviewSessions, eq(interviewSessions.id, interviewAnswers.sessionId))
    .where(eq(interviewSessions.userId, userId))
    .orderBy(desc(interviewAnswers.createdAt))
    .limit(30);
  const base = and(eq(interviewQuestions.status, "published"), eq(interviewQuestions.lang, opts.lang), inArray(interviewQuestions.kind, kinds as ("rh" | "technique" | "situation")[]));
  let pool = await db.select().from(interviewQuestions).where(and(base, eq(interviewQuestions.role, opts.role), recent.length ? notInArray(interviewQuestions.id, recent.map((r) => r.q)) : undefined));
  if (pool.length < wanted) pool = await db.select().from(interviewQuestions).where(and(base, eq(interviewQuestions.role, opts.role)));
  if (pool.length < wanted) pool = await db.select().from(interviewQuestions).where(and(base, inArray(interviewQuestions.role, [opts.role, "support_n1"])));
  if (!pool.length) throw new CareerError("Aucune question disponible pour cette combinaison. Essayez un autre type d'entretien ou une autre langue.");
  const sectorFirst = pool.filter((q) => opts.sector !== "general" && q.sectors.includes(opts.sector));
  const others = pool.filter((q) => !sectorFirst.includes(q)).sort(() => Math.random() - 0.5);
  // Ordre d'entretien réaliste : présentation (RH) d'abord, puis technique, puis mises en situation.
  const order = { rh: 0, technique: 1, situation: 2 } as const;
  const picked = [...sectorFirst.slice(0, 2), ...others].slice(0, wanted).sort((a, b) => order[a.kind] - order[b.kind]);
  const [row] = await db
    .insert(interviewSessions)
    .values({ userId, role: opts.role, level: opts.level, sector: opts.sector, kind: opts.kind, lang: opts.lang, durationMin: opts.durationMin, questionIds: picked.map((p) => p.id) })
    .returning({ id: interviewSessions.id });
  return row.id;
}

async function ownedInterview(db: Db, userId: string, sessionId: string) {
  const [s] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, sessionId)).limit(1);
  if (!s || s.userId !== userId) throw new ForbiddenError("Cette simulation n'existe pas ou ne vous appartient pas.");
  return s;
}

export async function getInterviewView(userId: string, sessionId: string, db: Db = getDb()) {
  const s = await ownedInterview(db, userId, sessionId);
  const qs = await db.select().from(interviewQuestions).where(inArray(interviewQuestions.id, s.questionIds));
  const byId = new Map(qs.map((q) => [q.id, q]));
  const ans = await db.select().from(interviewAnswers).where(eq(interviewAnswers.sessionId, s.id));
  const answered = new Map(ans.map((a) => [a.questionId, a]));
  return {
    session: { id: s.id, role: s.role, level: s.level, sector: s.sector, kind: s.kind, lang: s.lang, durationMin: s.durationMin, status: s.status, score: s.score },
    questions: s.questionIds.map((id, i) => {
      const q = byId.get(id)!;
      const a = answered.get(id);
      return {
        id,
        index: i,
        kind: q.kind,
        prompt: q.prompt,
        estimatedMinutes: q.estimatedMinutes,
        answer: a
          ? { text: a.answer, score: a.score, feedback: a.feedback, modelAnswer: q.modelAnswer, explanation: q.explanation, lessonSlugs: q.lessonSlugs }
          : null,
      };
    }),
  };
}

export async function answerInterviewQuestion(userId: string, sessionId: string, questionId: string, answerText: string, db: Db = getDb()) {
  const s = await ownedInterview(db, userId, sessionId);
  if (s.status !== "active") throw new CareerError("Cette simulation est terminée.");
  if (!s.questionIds.includes(questionId)) throw new CareerError("Question inconnue pour cette simulation.");
  const [q] = await db.select().from(interviewQuestions).where(eq(interviewQuestions.id, questionId));
  const text = answerText.trim().slice(0, 6000);
  const feedback: RubricResult = gradeText(text, q.rubric as InterviewRubric, 25);
  let score = feedback.percent;
  // Pour les questions comportementales, une structure Situation/Action/Résultat absente coûte des points.
  if ((q.rubric as InterviewRubric).expectStructure && feedback.structure) {
    const missing = Object.values(feedback.structure).filter((v) => !v).length;
    score = Math.max(0, score - missing * 5);
  }
  await db
    .insert(interviewAnswers)
    .values({ sessionId, questionId, answer: text, score, feedback })
    .onConflictDoUpdate({ target: [interviewAnswers.sessionId, interviewAnswers.questionId], set: { answer: text, score, feedback, createdAt: new Date() } });
  return { score, feedback, modelAnswer: q.modelAnswer, explanation: q.explanation, lessonSlugs: q.lessonSlugs };
}

export async function finishInterview(userId: string, sessionId: string, db: Db = getDb()) {
  const s = await ownedInterview(db, userId, sessionId);
  if (s.status !== "active") return s.score;
  const ans = await db.select({ score: interviewAnswers.score, questionId: interviewAnswers.questionId }).from(interviewAnswers).where(eq(interviewAnswers.sessionId, s.id));
  if (!ans.length) throw new CareerError("Répondez au moins à une question avant de terminer.");
  const score = Math.round(ans.reduce((a, x) => a + x.score, 0) / s.questionIds.length);
  await db.update(interviewSessions).set({ status: "completed", score, endedAt: new Date() }).where(eq(interviewSessions.id, s.id));
  const qs = await db.select({ id: interviewQuestions.id, skills: interviewQuestions.skills }).from(interviewQuestions).where(inArray(interviewQuestions.id, ans.map((a) => a.questionId)));
  const perSkill = new Map<string, number[]>();
  for (const a of ans) for (const k of qs.find((q) => q.id === a.questionId)?.skills ?? []) perSkill.set(k, [...(perSkill.get(k) ?? []), a.score]);
  await recordEvidence(db, userId, "interview", s.id, [...perSkill.entries()].map(([skillCode, v]) => ({ skillCode, score: v.reduce((x, y) => x + y, 0) / v.length })));
  await awardXp(db, userId, "interview_completed", s.id);
  if (score >= 70 && ans.length === s.questionIds.length) await awardBadge(db, userId, "pret-entretien");
  return score;
}

export async function listInterviews(userId: string, db: Db = getDb()) {
  return db.select().from(interviewSessions).where(eq(interviewSessions.userId, userId)).orderBy(desc(interviewSessions.startedAt)).limit(20);
}

/* ---------------------------------------------------------------- Passeport de compétences */

export const PASSPORT_POLICY_VERSION = "2026-10";

export async function getOrCreatePassport(userId: string, db: Db = getDb()) {
  const [p] = await db.select().from(skillPassports).where(eq(skillPassports.userId, userId)).limit(1);
  if (p) return p;
  const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId));
  const [created] = await db
    .insert(skillPassports)
    .values({ userId, publicCode: randomCode(12), displayName: u.name, enabled: false })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.select().from(skillPassports).where(eq(skillPassports.userId, userId)))[0];
}

export async function updatePassport(
  userId: string,
  input: { enabled: boolean; displayName: string; headline: string; showPortfolio: boolean },
  db: Db = getDb(),
) {
  const current = await getOrCreatePassport(userId, db);
  if (input.enabled !== current.enabled) {
    await db.insert(consentRecords).values({ userId, kind: "public_passport", granted: input.enabled, policyVersion: PASSPORT_POLICY_VERSION });
  }
  await db
    .update(skillPassports)
    .set({ enabled: input.enabled, displayName: input.displayName.slice(0, 80), headline: input.headline.slice(0, 160), showPortfolio: input.showPortfolio, updatedAt: new Date() })
    .where(eq(skillPassports.userId, userId));
}

export async function regeneratePassportCode(userId: string, db: Db = getDb()) {
  await getOrCreatePassport(userId, db);
  await db.update(skillPassports).set({ publicCode: randomCode(12), updatedAt: new Date() }).where(eq(skillPassports.userId, userId));
}

/** Vue publique : uniquement si le titulaire a activé son passeport. Aucun e-mail, aucune donnée brute. */
export async function getPublicPassport(code: string, db: Db = getDb()) {
  if (!/^[A-Z0-9]{6,20}$/.test(code)) return null;
  const [p] = await db.select().from(skillPassports).where(and(eq(skillPassports.publicCode, code), eq(skillPassports.enabled, true))).limit(1);
  if (!p) return null;
  const map = await getSkillMap(p.userId, db);
  const atts = await db.select({ title: attestations.title, code: attestations.verificationCode, issuedAt: attestations.issuedAt, details: attestations.details }).from(attestations).where(and(eq(attestations.userId, p.userId), isNull(attestations.revokedAt)));
  const portfolio = p.showPortfolio
    ? await db
        .select({ id: labSessions.id, title: scenarios.title, sector: scenarios.sector, score: labSessions.score, endedAt: labSessions.endedAt, report: labSessions.report })
        .from(labSessions)
        .innerJoin(scenarioVersions, eq(scenarioVersions.id, labSessions.scenarioVersionId))
        .innerJoin(scenarios, eq(scenarios.id, scenarioVersions.scenarioId))
        .where(and(eq(labSessions.userId, p.userId), eq(labSessions.status, "closed"), eq(labSessions.inPortfolio, true)))
        .orderBy(desc(labSessions.endedAt))
        .limit(12)
    : [];
  return {
    displayName: p.displayName,
    headline: p.headline,
    updatedAt: p.updatedAt,
    domains: map.domains.filter((d) => d.level !== null),
    skills: map.skills.filter((s) => s.level !== null),
    attestations: atts.filter((a) => a.code),
    portfolio: portfolio.map((x) => {
      const r = x.report as LabReport | null;
      return { id: x.id, title: x.title, sector: x.sector, score: x.score, endedAt: x.endedAt, steps: r?.timeline.length ?? 0, closingNote: r?.closingNote ?? "", resolved: r?.resolved ?? false };
    }),
  };
}

export async function verifyAttestation(code: string, db: Db = getDb()) {
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length < 6 || clean.length > 20) return null;
  const [a] = await db
    .select({ title: attestations.title, issuedAt: attestations.issuedAt, revokedAt: attestations.revokedAt, details: attestations.details, name: user.name })
    .from(attestations)
    .innerJoin(user, eq(user.id, attestations.userId))
    .where(eq(attestations.verificationCode, clean))
    .limit(1);
  return a ?? null;
}
