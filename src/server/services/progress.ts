import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { assessments, attempts, enrollments, learningTime, lessonProgress, lessons, lessonVersions, courseModules, courses } from "@/server/db/schema";
import type { LessonDoc } from "@/content/schema";
import { gradeText, type RubricResult } from "@/server/engines/rubric";
import { ForbiddenError } from "@/server/authz/policies";
import { getUserTier } from "./entitlements";
import { recordEvidence } from "./skills";
import { awardXp } from "./xp";

export class ProgressError extends Error {}

async function lessonWithAccess(db: Db, userId: string, slug: string) {
  const [l] = await db
    .select({ id: lessons.id, requiredTier: lessons.requiredTier, courseTier: courses.requiredTier, courseId: courses.id, publishedVersionId: lessons.publishedVersionId })
    .from(lessons)
    .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, courseModules.courseId))
    .where(and(eq(lessons.slug, slug), eq(lessons.status, "published")))
    .limit(1);
  if (!l) throw new ProgressError("Leçon introuvable.");
  const tier = await getUserTier(userId, db);
  if (tier < (l.requiredTier ?? l.courseTier)) throw new ForbiddenError("Cette leçon fait partie d'une offre supérieure.");
  return l;
}

/** Enregistre la position de lecture et le temps passé (borné pour éviter les valeurs aberrantes). */
export async function touchLesson(userId: string, slug: string, blockId: string | null, deltaSec: number, db: Db = getDb()) {
  const l = await lessonWithAccess(db, userId, slug);
  const delta = Math.max(0, Math.min(300, Math.round(deltaSec)));
  await db
    .insert(enrollments)
    .values({ userId, courseId: l.courseId })
    .onConflictDoNothing({ target: [enrollments.userId, enrollments.courseId] });
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId: l.id, lastBlockId: blockId, timeSpentSec: delta })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        lastBlockId: blockId ?? sql`${lessonProgress.lastBlockId}`,
        timeSpentSec: sql`${lessonProgress.timeSpentSec} + ${delta}`,
        updatedAt: new Date(),
      },
    });
  if (delta > 0) {
    const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
    await db
      .insert(learningTime)
      .values({ userId, day, seconds: delta })
      .onConflictDoUpdate({ target: [learningTime.userId, learningTime.day], set: { seconds: sql`${learningTime.seconds} + ${delta}` } });
  }
}

/**
 * Condition de validation d'une leçon : son quiz doit être réussi (≥ seuil) au moins une fois.
 * Une leçon sans quiz se valide sur simple confirmation.
 */
export async function completeLesson(userId: string, slug: string, db: Db = getDb()) {
  const l = await lessonWithAccess(db, userId, slug);
  const [quiz] = await db.select({ id: assessments.id, passPercent: assessments.passPercent }).from(assessments).where(and(eq(assessments.lessonId, l.id), eq(assessments.kind, "lesson_quiz"))).limit(1);
  if (quiz) {
    const [best] = await db
      .select({ percent: attempts.percent })
      .from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.assessmentId, quiz.id), eq(attempts.status, "submitted")))
      .orderBy(desc(attempts.percent))
      .limit(1);
    if (!best || (best.percent ?? 0) < quiz.passPercent) {
      throw new ProgressError(`Réussissez le quiz de la leçon (au moins ${quiz.passPercent} %) pour la valider.`);
    }
  }
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId: l.id, status: "completed", completedAt: new Date() })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: { status: "completed", completedAt: new Date(), updatedAt: new Date() } });
  await awardXp(db, userId, "lesson_completed", l.id);
  // Formation terminée ?
  const all = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
    .where(and(eq(courseModules.courseId, l.courseId), eq(lessons.status, "published")));
  const done = await db
    .select({ id: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"), inArray(lessonProgress.lessonId, all.map((a) => a.id))));
  if (done.length === all.length) {
    await db
      .update(enrollments)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, l.courseId)));
  }
  return { courseCompleted: done.length === all.length };
}

export async function getLessonProgress(userId: string, lessonId: string, db: Db = getDb()) {
  const [p] = await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId))).limit(1);
  return p ?? null;
}

export async function getProgressMap(userId: string, db: Db = getDb()) {
  const rows = await db.select({ lessonId: lessonProgress.lessonId, status: lessonProgress.status, updatedAt: lessonProgress.updatedAt, timeSpentSec: lessonProgress.timeSpentSec }).from(lessonProgress).where(eq(lessonProgress.userId, userId));
  return new Map(rows.map((r) => [r.lessonId, r]));
}

type ExerciseBlock = Extract<LessonDoc["blocks"][number], { kind: "exercise" }>;

async function exerciseBlock(db: Db, userId: string, slug: string, blockId: string) {
  const l = await lessonWithAccess(db, userId, slug);
  const [v] = await db.select({ content: lessonVersions.content }).from(lessonVersions).where(eq(lessonVersions.id, l.publishedVersionId!)).limit(1);
  const block = (v?.content as LessonDoc | undefined)?.blocks.find((b) => b.id === blockId && b.kind === "exercise") as ExerciseBlock | undefined;
  if (!block) throw new ProgressError("Exercice introuvable.");
  const p = await getLessonProgress(userId, l.id, db);
  const state = p?.exerciseState?.[blockId] ?? { hints: 0, solutionSeen: false };
  return { l, block, state, all: p?.exerciseState ?? {} };
}

async function saveExerciseState(db: Db, userId: string, lessonId: string, all: Record<string, { hints: number; solutionSeen: boolean; score?: number }>) {
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId, exerciseState: all })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: { exerciseState: all, updatedAt: new Date() } });
}

/** Indices graduels (1 → 3) puis correction complète (niveau 4). Chaque consultation est mémorisée. */
export async function revealExercise(userId: string, slug: string, blockId: string, level: 1 | 2 | 3 | 4, db: Db = getDb()) {
  const { l, block, state, all } = await exerciseBlock(db, userId, slug, blockId);
  if (level <= 3 && level > state.hints + 1) throw new ProgressError("Consultez les indices dans l'ordre.");
  const next = { ...state, hints: Math.max(state.hints, Math.min(level, 3)), solutionSeen: state.solutionSeen || level === 4 };
  await saveExerciseState(db, userId, l.id, { ...all, [blockId]: next });
  return {
    hints: block.hints.slice(0, next.hints),
    solution: next.solutionSeen ? block.solution : null,
    state: next,
  };
}

export async function getExerciseState(userId: string, slug: string, blockId: string, db: Db = getDb()) {
  const { block, state } = await exerciseBlock(db, userId, slug, blockId);
  return { hints: block.hints.slice(0, state.hints), solution: state.solutionSeen ? block.solution : null, state, gradable: Boolean(block.rubric) };
}

/**
 * Notation d'une réponse libre à l'exercice d'une leçon.
 * −10 points par indice ; si la correction a été consultée avant la réponse, le score est plafonné à 50.
 */
export async function submitExerciseAnswer(userId: string, slug: string, blockId: string, answer: string, db: Db = getDb()) {
  const { l, block, state, all } = await exerciseBlock(db, userId, slug, blockId);
  if (!block.rubric) throw new ProgressError("Cet exercice se corrige avec la correction commentée.");
  const result: RubricResult = gradeText(answer.slice(0, 5000), block.rubric, 15);
  let score = Math.max(0, result.percent - state.hints * 10);
  if (state.solutionSeen) score = Math.min(score, 50);
  await saveExerciseState(db, userId, l.id, { ...all, [blockId]: { ...state, score } });
  const [v] = await db.select({ content: lessonVersions.content }).from(lessonVersions).where(eq(lessonVersions.id, l.publishedVersionId!)).limit(1);
  const skillCodes = (v?.content as LessonDoc | undefined)?.meta.skills.map((k) => k.code) ?? [];
  await recordEvidence(db, userId, "exercise", `${l.id}#${blockId}`, skillCodes.map((skillCode) => ({ skillCode, score })));
  if (result.passed) await awardXp(db, userId, "exercise_passed", `${l.id}#${blockId}`);
  return { result, score, hintsUsed: state.hints, solutionSeen: state.solutionSeen };
}
