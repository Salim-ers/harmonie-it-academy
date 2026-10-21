"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { run } from "./result";
import { closeLab, getLabView, labStep, setLabInPortfolio, startLab } from "@/server/services/labs";
import { consumeRateLimit } from "@/server/services/rate-limit";

const uuid = z.uuid();
const id = z.string().regex(/^[a-z0-9-]{1,64}$/);

export async function startLabAction(scenarioSlug: string, restart = false) {
  return run(async () => {
    const u = await requireUser();
    return { sessionId: await startLab(u.id, id.parse(scenarioSlug), { restart }) };
  });
}

export async function labStepAction(
  sessionId: string,
  step: { kind: "action"; actionId: string; confirmRisk?: boolean } | { kind: "diagnosis"; diagnosisId: string } | { kind: "resolution"; resolutionId: string } | { kind: "hint" },
) {
  return run(async () => {
    const u = await requireUser();
    await consumeRateLimit(`lab:${u.id}`, 600, 3600);
    const s = z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("action"), actionId: id, confirmRisk: z.boolean().optional() }),
        z.object({ kind: z.literal("diagnosis"), diagnosisId: id }),
        z.object({ kind: z.literal("resolution"), resolutionId: id }),
        z.object({ kind: z.literal("hint") }),
      ])
      .parse(step);
    const r = await labStep(u.id, uuid.parse(sessionId), s);
    return { ...r, lab: await getLabView(u.id, sessionId) };
  });
}

export async function closeLabAction(sessionId: string, note: string) {
  return run(async () => {
    const u = await requireUser();
    await closeLab(u.id, uuid.parse(sessionId), z.string().max(4000).parse(note));
    return getLabView(u.id, sessionId);
  });
}

export async function portfolioAction(sessionId: string, inPortfolio: boolean) {
  return run(async () => {
    const u = await requireUser();
    await setLabInPortfolio(u.id, uuid.parse(sessionId), inPortfolio);
  });
}
