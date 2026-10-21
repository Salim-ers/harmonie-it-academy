import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { env, features } from "@/lib/env";
import { getDb } from "@/server/db";
import { account, rateLimit, session, twoFactor as twoFactorTable, user, verification } from "@/server/db/schema";
import { layout, sendEmail } from "@/server/services/email";
import { recordAudit } from "@/server/services/audit";

function createAuth() {
  const e = env();
  const relaxed = e.NODE_ENV !== "production" && process.env.HIA_RELAX_RATE_LIMIT === "1";
  return betterAuth({
    appName: "Harmonie IT Academy",
    baseURL: e.APP_URL,
    secret: e.BETTER_AUTH_SECRET,
    trustedOrigins: [e.APP_URL],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user, session, account, verification, twoFactor: twoFactorTable, rateLimit },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 30,
      sendResetPassword: async ({ user: u, url }) => {
        const { html, text } = layout({
          title: "Réinitialiser votre mot de passe",
          intro: "Vous avez demandé à réinitialiser le mot de passe de votre compte Harmonie IT Academy. Ce lien est valable 30 minutes et ne peut servir qu'une fois.",
          cta: { label: "Choisir un nouveau mot de passe", url },
          outro: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.",
        });
        await sendEmail({ to: u.email, subject: "Réinitialisation de votre mot de passe", html, text });
      },
      onPasswordReset: async ({ user: u }) => {
        await recordAudit({ actorId: u.id, action: "auth.password_reset", targetType: "user", targetId: u.id });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user: u, url }) => {
        const { html, text } = layout({
          title: "Confirmez votre adresse e-mail",
          intro: `Bonjour ${u.name}, bienvenue sur Harmonie IT Academy. Confirmez votre adresse pour activer votre compte et conserver votre progression.`,
          cta: { label: "Confirmer mon adresse", url },
          outro: "Ce lien est valable 24 heures.",
        });
        await sendEmail({ to: u.email, subject: "Confirmez votre adresse e-mail", html, text });
      },
    },
    socialProviders: {
      ...(features.google() ? { google: { clientId: e.GOOGLE_CLIENT_ID!, clientSecret: e.GOOGLE_CLIENT_SECRET! } } : {}),
      ...(features.microsoft()
        ? { microsoft: { clientId: e.MICROSOFT_CLIENT_ID!, clientSecret: e.MICROSOFT_CLIENT_SECRET!, tenantId: e.MICROSOFT_TENANT_ID } }
        : {}),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 15,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: relaxed ? 1000 : 120,
      customRules: relaxed
        ? {}
        : {
            "/sign-in/email": { window: 60, max: 5 },
            "/sign-up/email": { window: 600, max: 5 },
            "/request-password-reset": { window: 600, max: 3 },
            "/send-verification-email": { window: 600, max: 3 },
            "/two-factor/verify-totp": { window: 60, max: 5 },
            "/two-factor/verify-backup-code": { window: 60, max: 3 },
          },
    },
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "student", required: false },
        status: { type: "string", input: false, defaultValue: "active", required: false },
      },
      deleteUser: { enabled: true },
    },
    databaseHooks: {
      session: {
        create: {
          // Un compte suspendu ne peut pas ouvrir de session, quel que soit le moyen d'authentification.
          before: async (s) => {
            const [u] = await getDb().select({ status: user.status }).from(user).where(eq(user.id, s.userId)).limit(1);
            if (!u || u.status !== "active") return false;
            return { data: s };
          },
        },
      },
    },
    advanced: {
      useSecureCookies: e.NODE_ENV === "production",
      cookiePrefix: "hia",
    },
    plugins: [twoFactor({ issuer: "Harmonie IT Academy" }), nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
const g = globalThis as unknown as { __hiaAuth?: Auth };

export function getAuth(): Auth {
  if (!g.__hiaAuth) g.__hiaAuth = createAuth();
  return g.__hiaAuth;
}
