"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { requireStudio, requireUser } from "@/server/auth/session";
import { run } from "./result";
import { claimSubmission, gradeSubmissionReview, submitAssignment } from "@/server/services/mentoring";
import { consumeRateLimit } from "@/server/services/rate-limit";

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);
const uuid = z.uuid();

export async function submitAssignmentAction(input: { slug: string; body: string }) {
  return run(async () => {
    const u = await requireUser();
    const p = z.object({ slug, body: z.string().max(12000) }).parse(input);
    await consumeRateLimit(`assignment:${u.id}`, 10, 86400);
    await submitAssignment(u.id, p.slug, p.body);
    refresh();
  });
}

export async function claimSubmissionAction(id: string) {
  return run(async () => {
    const { actor } = await requireStudio();
    await claimSubmission(actor, uuid.parse(id));
    refresh();
  });
}

export async function gradeSubmissionAction(input: { id: string; points: number[]; feedback: string }) {
  return run(async () => {
    const { actor } = await requireStudio();
    const p = z.object({ id: uuid, points: z.array(z.number().int().min(0).max(100)).max(20), feedback: z.string().max(6000) }).parse(input);
    const score = await gradeSubmissionReview(actor, p.id, { points: p.points, feedback: p.feedback });
    refresh();
    return { score };
  });
}
