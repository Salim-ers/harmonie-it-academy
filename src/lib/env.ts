import "server-only";
import { z } from "zod";

/**
 * Variables d'environnement serveur, validées au premier accès.
 * Aucune n'est exposée au navigateur (pas de préfixe NEXT_PUBLIC_ ici).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est obligatoire"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET doit contenir au moins 32 caractères"),
  EMAIL_FROM: z.string().default("Harmonie IT Academy <no-reply@example.com>"),
  RESEND_API_KEY: z.string().optional(),
  /** Enregistre les e-mails dans la table dev_outbox (jamais en production). */
  EMAIL_DEV_OUTBOX: z.enum(["0", "1"]).default("1"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().default("common"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_TUTOR_MODEL: z.string().default("claude-haiku-5-5"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;
let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuration invalide — ${issues}`);
  }
  if (parsed.data.NODE_ENV === "production") {
    if (parsed.data.EMAIL_DEV_OUTBOX === "1" && !process.env.CI) parsed.data.EMAIL_DEV_OUTBOX = "0";
    if (parsed.data.STORAGE_DRIVER === "local" && process.env.VERCEL) {
      throw new Error("STORAGE_DRIVER=local est interdit sur Vercel : configurez un stockage S3/R2.");
    }
  }
  cached = parsed.data;
  return cached;
}

export const features = {
  stripe: () => Boolean(env().STRIPE_SECRET_KEY && env().STRIPE_WEBHOOK_SECRET),
  google: () => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET),
  microsoft: () => Boolean(env().MICROSOFT_CLIENT_ID && env().MICROSOFT_CLIENT_SECRET),
  ai: () => Boolean(env().ANTHROPIC_API_KEY),
  email: () => Boolean(env().RESEND_API_KEY),
};
