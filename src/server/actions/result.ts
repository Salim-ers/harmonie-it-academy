import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { ForbiddenError } from "@/server/authz/policies";
import { ScenarioError } from "@/server/engines/scenario-engine";
import { InvalidResponseError } from "@/server/engines/grading";
import { RateLimitError } from "@/server/services/rate-limit";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const SAFE_ERRORS = ["AssessmentError", "ProgressError", "CareerError", "BillingError", "StudioError", "SupportError", "SatisfactionError", "MentoringError"];

/**
 * Exécute une action serveur et ne renvoie au navigateur que des messages sûrs.
 * Les erreurs inattendues sont journalisées côté serveur avec un identifiant, jamais détaillées au client.
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ForbiddenError || e instanceof ScenarioError || e instanceof InvalidResponseError || e instanceof RateLimitError) {
      return { ok: false, error: e.message };
    }
    if (e instanceof ZodError) return { ok: false, error: "Certaines informations envoyées sont invalides." };
    if (e instanceof Error && SAFE_ERRORS.includes(e.constructor.name)) return { ok: false, error: e.message };
    const ref = Math.random().toString(36).slice(2, 10);
    console.error(`[action:${ref}]`, e);
    return { ok: false, error: `Une erreur technique est survenue (réf. ${ref}). Réessayez ; si elle persiste, contactez le support.` };
  }
}
