import "server-only";
import { and, count, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { assignments, notifications, submissions, user } from "@/server/db/schema";
import { can, ForbiddenError, type Actor } from "@/server/authz/policies";
import { getUserTier } from "./entitlements";
import { recordEvidence } from "./skills";
import { recordAudit } from "./audit";

export class MentoringError extends Error {}

/** Plafond de relectures pour garder des délais tenables (« selon disponibilité » dans l'offre). */
export const MONTHLY_SUBMISSIONS = 4;
const MIN_BODY = 300;
const MIN_FEEDBACK = 120;

export type Rubric = { criterion: string; points: number; skill?: string }[];

/* ------------------------------------------------------------------ Côté apprenant */

export async function listAssignmentsForLearner(userId: string, db: Db = getDb()) {
  const [list, mine, tier, used] = await Promise.all([
    db.select({ id: assignments.id, slug: assignments.slug, title: assignments.title, requiredTier: assignments.requiredTier }).from(assignments).orderBy(assignments.title),
    db
      .select({ assignmentId: submissions.assignmentId, status: submissions.status, score: submissions.score, createdAt: submissions.createdAt })
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt)),
    getUserTier(userId, db),
    monthlyUsed(userId, db),
  ]);
  const latest = new Map<string, (typeof mine)[number]>();
  for (const m of mine) if (!latest.has(m.assignmentId)) latest.set(m.assignmentId, m);
  return { tier, remaining: Math.max(0, MONTHLY_SUBMISSIONS - used), items: list.map((a) => ({ ...a, latest: latest.get(a.id) ?? null })) };
}

async function monthlyUsed(userId: string, db: Db) {
  const [r] = await db
    .select({ n: count() })
    .from(submissions)
    .where(and(eq(submissions.userId, userId), gte(submissions.createdAt, sql`now() - interval '30 days'`)));
  return r.n;
}

export async function getAssignmentForLearner(userId: string, slug: string, db: Db = getDb()) {
  const [a] = await db.select().from(assignments).where(eq(assignments.slug, slug)).limit(1);
  if (!a) return null;
  const [history, tier, used] = await Promise.all([
    db
      .select({ id: submissions.id, body: submissions.body, status: submissions.status, score: submissions.score, feedback: submissions.feedback, createdAt: submissions.createdAt, reviewedAt: submissions.reviewedAt })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), eq(submissions.assignmentId, a.id)))
      .orderBy(desc(submissions.createdAt)),
    getUserTier(userId, db),
    monthlyUsed(userId, db),
  ]);
  return { assignment: { ...a, rubric: a.rubric as Rubric }, history, tier, remaining: Math.max(0, MONTHLY_SUBMISSIONS - used) };
}

export async function submitAssignment(userId: string, slug: string, body: string, db: Db = getDb()) {
  const text = body.trim();
  const [a] = await db.select().from(assignments).where(eq(assignments.slug, slug)).limit(1);
  if (!a) throw new MentoringError("Ce livrable n'existe pas.");
  if ((await getUserTier(userId, db)) < a.requiredTier) throw new ForbiddenError("La relecture par un mentor est incluse dans l'offre Academy Pro.");
  if (text.length < MIN_BODY) throw new MentoringError(`Votre texte est trop court pour une relecture utile (${MIN_BODY} caractères minimum).`);
  if (text.length > 12000) throw new MentoringError("Votre texte dépasse 12 000 caractères.");
  return db.transaction(async (tx) => {
    // Verrou par apprenant : deux envois simultanés ne peuvent pas dépasser le plafond.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`mentoring:${userId}`}))`);
    const [pending] = await tx
      .select({ n: count() })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), eq(submissions.assignmentId, a.id), inArray(submissions.status, ["submitted", "in_review"])));
    if (pending.n > 0) throw new MentoringError("Une version de ce livrable attend déjà sa relecture.");
    if ((await monthlyUsed(userId, tx as unknown as Db)) >= MONTHLY_SUBMISSIONS)
      throw new MentoringError(`Vous avez utilisé vos ${MONTHLY_SUBMISSIONS} relectures des 30 derniers jours. La prochaine sera possible dès qu'une relecture sortira de cette période.`);
    const [row] = await tx.insert(submissions).values({ assignmentId: a.id, userId, body: text }).returning({ id: submissions.id });
    return row.id;
  });
}

/* ------------------------------------------------------------------ Côté mentor (Studio) */

export async function listMentorQueue(actor: Actor, db: Db = getDb()) {
  const rows = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      createdAt: submissions.createdAt,
      reviewerId: submissions.reviewerId,
      assignment: assignments.title,
      courseId: assignments.courseId,
      learner: user.name,
      learnerId: submissions.userId,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(user, eq(user.id, submissions.userId))
    .where(and(inArray(submissions.status, ["submitted", "in_review"]), ne(submissions.userId, actor.id)))
    .orderBy(submissions.createdAt)
    .limit(200);
  return rows.filter((r) => can.gradeSubmission(actor, r.courseId));
}

async function loadForReview(actor: Actor, id: string, db: Db) {
  const [row] = await db
    .select({ s: submissions, a: assignments, learner: user.name })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(user, eq(user.id, submissions.userId))
    .where(eq(submissions.id, id))
    .limit(1);
  if (!row || !can.gradeSubmission(actor, row.a.courseId)) throw new ForbiddenError();
  if (row.s.userId === actor.id) throw new ForbiddenError("Vous ne pouvez pas relire votre propre livrable.");
  return row;
}

export async function getSubmissionForReview(actor: Actor, id: string, db: Db = getDb()) {
  const row = await loadForReview(actor, id, db);
  return { ...row, rubric: row.a.rubric as Rubric };
}

export async function claimSubmission(actor: Actor, id: string, db: Db = getDb()) {
  await loadForReview(actor, id, db);
  const updated = await db
    .update(submissions)
    .set({ status: "in_review", reviewerId: actor.id })
    .where(and(eq(submissions.id, id), eq(submissions.status, "submitted")))
    .returning({ id: submissions.id });
  if (!updated.length) throw new MentoringError("Ce livrable est déjà pris en charge.");
}

export async function gradeSubmissionReview(actor: Actor, id: string, input: { points: number[]; feedback: string }, db: Db = getDb()) {
  const row = await loadForReview(actor, id, db);
  const rubric = row.a.rubric as Rubric;
  if (row.s.status !== "in_review" || row.s.reviewerId !== actor.id) throw new MentoringError("Prenez d'abord ce livrable en charge.");
  if (input.points.length !== rubric.length) throw new MentoringError("Notez chaque critère de la grille.");
  input.points.forEach((p, i) => {
    if (!Number.isInteger(p) || p < 0 || p > rubric[i].points) throw new MentoringError(`Critère « ${rubric[i].criterion} » : note entre 0 et ${rubric[i].points}.`);
  });
  const feedback = input.feedback.trim();
  if (feedback.length < MIN_FEEDBACK) throw new MentoringError(`Le commentaire doit aider l'apprenant à progresser : ${MIN_FEEDBACK} caractères minimum.`);
  const total = rubric.reduce((a, r) => a + r.points, 0);
  const score = Math.round((input.points.reduce((a, p) => a + p, 0) / total) * 100);
  const detail = rubric.map((r, i) => `• ${r.criterion} : ${input.points[i]} / ${r.points}`).join("\n");

  await db.transaction(async (tx) => {
    await tx
      .update(submissions)
      .set({ status: "reviewed", score, feedback: `${feedback}\n\n${detail}`, reviewedAt: new Date() })
      .where(eq(submissions.id, id));
    // Preuve de compétence : moyenne des critères rattachés à chaque compétence.
    const bySkill = new Map<string, { got: number; max: number }>();
    rubric.forEach((r, i) => {
      if (!r.skill) return;
      const cur = bySkill.get(r.skill) ?? { got: 0, max: 0 };
      bySkill.set(r.skill, { got: cur.got + input.points[i], max: cur.max + r.points });
    });
    await recordEvidence(tx as unknown as Db, row.s.userId, "mentor", id, [...bySkill].map(([skillCode, v]) => ({ skillCode, score: (v.got / v.max) * 100 })));
    await tx.insert(notifications).values({ userId: row.s.userId, kind: "mentor", title: `Votre livrable « ${row.a.title} » a été relu`, href: `/campus/livrables/${row.a.slug}` });
  });
  await recordAudit({ actorId: actor.id, action: "submission.review", targetType: "submission", targetId: id, metadata: { score } });
  return score;
}
