"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { run } from "./result";
import { completeLesson, getExerciseState, revealExercise, submitExerciseAnswer, touchLesson } from "@/server/services/progress";
import { getAttemptView, getPublicQuiz, saveAnswer, startAttempt, submitAttempt, submitInlineQuiz } from "@/server/services/assessments";
import { consumeRateLimit } from "@/server/services/rate-limit";
import { getUserTier } from "@/server/services/entitlements";
import { ForbiddenError } from "@/server/authz/policies";
import { submitSatisfaction } from "@/server/services/satisfaction";

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);
const uuid = z.uuid();
const blockId = z.string().regex(/^[a-z0-9-]{1,64}$/);

export async function touchLessonAction(input: { slug: string; blockId: string | null; deltaSec: number }) {
  return run(async () => {
    const u = await requireUser();
    const p = z.object({ slug, blockId: blockId.nullable(), deltaSec: z.number().min(0).max(3600) }).parse(input);
    await touchLesson(u.id, p.slug, p.blockId, p.deltaSec);
  });
}

export async function completeLessonAction(lessonSlug: string) {
  return run(async () => {
    const u = await requireUser();
    const r = await completeLesson(u.id, slug.parse(lessonSlug));
    refresh();
    return r;
  });
}

export async function getQuizAction(quizSlug: string) {
  return run(async () => {
    const u = await requireUser();
    const q = await getPublicQuiz(slug.parse(quizSlug));
    if ((await getUserTier(u.id)) < q.requiredTier) throw new ForbiddenError("Ce quiz fait partie d'une offre supérieure.");
    return q;
  });
}

export async function submitQuizAction(quizSlug: string, responses: Record<string, unknown>) {
  return run(async () => {
    const u = await requireUser();
    await consumeRateLimit(`quiz:${u.id}`, 60, 3600);
    const r = z.record(uuid, z.unknown()).parse(responses);
    return submitInlineQuiz(u.id, slug.parse(quizSlug), r);
  });
}

export async function revealExerciseAction(input: { slug: string; blockId: string; level: number }) {
  return run(async () => {
    const u = await requireUser();
    const p = z.object({ slug, blockId, level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) }).parse(input);
    return revealExercise(u.id, p.slug, p.blockId, p.level);
  });
}

export async function getExerciseStateAction(input: { slug: string; blockId: string }) {
  return run(async () => {
    const u = await requireUser();
    const p = z.object({ slug, blockId }).parse(input);
    return getExerciseState(u.id, p.slug, p.blockId);
  });
}

export async function submitExerciseAction(input: { slug: string; blockId: string; answer: string }) {
  return run(async () => {
    const u = await requireUser();
    await consumeRateLimit(`exercise:${u.id}`, 60, 3600);
    const p = z.object({ slug, blockId, answer: z.string().min(1).max(5000) }).parse(input);
    return submitExerciseAnswer(u.id, p.slug, p.blockId, p.answer);
  });
}

export async function startAttemptAction(assessmentSlug: string) {
  return run(async () => {
    const u = await requireUser();
    return { attemptId: await startAttempt(u.id, slug.parse(assessmentSlug)) };
  });
}

export async function saveAnswerAction(input: { attemptId: string; questionId: string; response: unknown }) {
  return run(async () => {
    const u = await requireUser();
    const p = z.object({ attemptId: uuid, questionId: uuid, response: z.unknown() }).parse(input);
    await saveAnswer(u.id, p.attemptId, p.questionId, p.response);
  });
}

export async function submitAttemptAction(attemptId: string) {
  return run(async () => {
    const u = await requireUser();
    const view = await submitAttempt(u.id, uuid.parse(attemptId));
    refresh();
    return view;
  });
}

export async function getAttemptAction(attemptId: string) {
  return run(async () => {
    const u = await requireUser();
    return getAttemptView(u.id, uuid.parse(attemptId));
  });
}

export async function submitSatisfactionAction(input: { courseId: string; rating: number; usefulForJob: boolean | null; comment: string }) {
  return run(async () => {
    const u = await requireUser();
    const p = z
      .object({ courseId: uuid, rating: z.number().int().min(1).max(5), usefulForJob: z.boolean().nullable(), comment: z.string().trim().max(1500) })
      .parse(input);
    await consumeRateLimit(`satisfaction:${u.id}`, 20, 86400);
    await submitSatisfaction(u.id, p);
    refresh();
  });
}
