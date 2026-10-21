"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { getAuth } from "@/server/auth/auth";
import { getDb } from "@/server/db";
import { consentRecords, user, userProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { consumeRateLimit } from "@/server/services/rate-limit";

const TERMS_VERSION = "2026-10";

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre prénom et votre nom.").max(80),
  email: z.email("Adresse e-mail invalide.").max(254),
  password: z
    .string()
    .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
    .max(128)
    .refine((p) => /[a-zA-Z]/.test(p) && /[0-9\W_]/.test(p), "Mélangez au moins des lettres et des chiffres ou symboles."),
  terms: z.literal("on", { error: "Acceptez les conditions d'utilisation pour continuer." }),
  next: z.string().optional(),
});

export type SignUpState = { error?: string; done?: boolean; email?: string };

/** Inscription : validation serveur, limite par IP, consentement horodaté, e-mail de vérification. */
export async function signUpAction(_prev: SignUpState, form: FormData): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  try {
    await consumeRateLimit(`signup:${ip}`, 5, 3600);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const next = parsed.data.next && parsed.data.next.startsWith("/") && !parsed.data.next.startsWith("//") ? parsed.data.next : "/campus";
  try {
    await getAuth().api.signUpEmail({
      body: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), password: parsed.data.password, callbackURL: `/bienvenue?suite=${encodeURIComponent(next)}` },
      headers: h,
    });
  } catch (e) {
    if (e instanceof APIError) {
      // Réponse identique que l'adresse existe ou non (pas d'énumération des comptes).
      if (e.body?.code === "USER_ALREADY_EXISTS" || e.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return { done: true, email: parsed.data.email };
      if (e.body?.code === "PASSWORD_TOO_SHORT") return { error: "Le mot de passe doit contenir au moins 12 caractères." };
      return { error: "L'inscription n'a pas abouti. Vérifiez vos informations." };
    }
    throw e;
  }
  const db = getDb();
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, parsed.data.email.toLowerCase())).limit(1);
  if (u) {
    await db.insert(consentRecords).values({ userId: u.id, kind: "terms", granted: true, policyVersion: TERMS_VERSION });
    await db.insert(userProfiles).values({ userId: u.id }).onConflictDoNothing();
  }
  return { done: true, email: parsed.data.email };
}
