"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { run } from "./result";
import {
  CareerError,
  analyzeOffer,
  answerInterviewQuestion,
  deleteJobAnalysis,
  finishInterview,
  regeneratePassportCode,
  startInterview,
  updatePassport,
} from "@/server/services/career";
import { consumeRateLimit } from "@/server/services/rate-limit";
import { reviewMyCv } from "@/server/services/cv";
import { INTERVIEW_ROLES } from "@/content/career-schema";

const uuid = z.uuid();

export async function analyzeOfferAction(_prev: unknown, form: FormData) {
  const u = await requireUser("/campus/carriere");
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Donnez un titre à l'offre (ex. : Technicien support N1 — Lyon).").max(160),
      offerText: z.string().trim().min(200, "Collez le texte complet de l'offre (au moins 200 caractères).").max(20000),
      interviewDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
    })
    .safeParse({ title: form.get("title"), offerText: form.get("offerText"), interviewDate: form.get("interviewDate") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await consumeRateLimit(`offer:${u.id}`, 20, 86400);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const id = await analyzeOffer(u.id, { ...parsed.data, interviewDate: parsed.data.interviewDate || null });
  redirect(`/campus/carriere/offres/${id}`);
}

export async function deleteAnalysisAction(id: string) {
  return run(async () => {
    const u = await requireUser();
    await deleteJobAnalysis(u.id, uuid.parse(id));
    refresh();
  });
}

const interviewOptions = z.object({
  role: z.enum(INTERVIEW_ROLES),
  level: z.enum(["debutant", "intermediaire", "avance"]),
  sector: z.enum(["general", "logistique", "industrie", "retail", "sante"]),
  kind: z.enum(["rh", "technique", "mixte"]),
  lang: z.enum(["fr", "en"]),
  durationMin: z.union([z.literal(15), z.literal(30), z.literal(45)]),
});

export async function startInterviewAction(input: z.infer<typeof interviewOptions>) {
  return run(async () => {
    const u = await requireUser();
    return { sessionId: await startInterview(u.id, interviewOptions.parse(input)) };
  });
}

export async function answerInterviewAction(input: { sessionId: string; questionId: string; answer: string }) {
  return run(async () => {
    const u = await requireUser();
    await consumeRateLimit(`interview:${u.id}`, 120, 3600);
    const p = z.object({ sessionId: uuid, questionId: uuid, answer: z.string().trim().min(1, "Rédigez votre réponse.").max(6000) }).parse(input);
    return answerInterviewQuestion(u.id, p.sessionId, p.questionId, p.answer);
  });
}

export async function finishInterviewAction(sessionId: string) {
  return run(async () => {
    const u = await requireUser();
    const score = await finishInterview(u.id, uuid.parse(sessionId));
    refresh();
    return { score };
  });
}

export async function updatePassportAction(input: { enabled: boolean; displayName: string; headline: string; showPortfolio: boolean }) {
  return run(async () => {
    const u = await requireUser();
    const p = z
      .object({ enabled: z.boolean(), displayName: z.string().trim().min(2).max(80), headline: z.string().trim().max(160), showPortfolio: z.boolean() })
      .parse(input);
    await updatePassport(u.id, p);
    refresh();
  });
}

export async function regeneratePassportCodeAction() {
  return run(async () => {
    const u = await requireUser();
    await regeneratePassportCode(u.id);
    refresh();
  });
}

const cvInput = z.object({
  cvText: z.string().trim().min(200, "Collez le texte complet de votre CV (au moins 200 caractères).").max(15000, "Le texte dépasse 15 000 caractères : retirez ce qui ne concerne pas le poste."),
  offerId: z.union([z.literal(""), z.uuid()]),
});

/** Relecture de CV : rien n'est enregistré, le résultat revient directement au navigateur. */
export async function reviewCvAction(input: z.infer<typeof cvInput>) {
  return run(async () => {
    const u = await requireUser();
    const parsed = cvInput.safeParse(input);
    if (!parsed.success) throw new CareerError(parsed.error.issues[0].message);
    await consumeRateLimit(`cv:${u.id}`, 30, 86400);
    return reviewMyCv(u.id, { cvText: parsed.data.cvText, offerId: parsed.data.offerId || null });
  });
}
