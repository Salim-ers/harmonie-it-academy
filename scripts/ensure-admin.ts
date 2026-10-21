/**
 * Crée le compte administrateur décrit par ADMIN_EMAIL / ADMIN_PASSWORD (facultatif, idempotent).
 *
 *   npx tsx scripts/ensure-admin.ts
 *
 * - compte absent : créé avec l'adresse déjà vérifiée (aucun e-mail nécessaire) et le rôle super_admin ;
 * - compte existant : promu super_admin et adresse marquée vérifiée ;
 * - tant que ADMIN_PASSWORD est défini, il devient le mot de passe du compte à chaque exécution
 *   (le retirer des variables une fois connecté pour garder un mot de passe changé dans l'application).
 * La double authentification reste à activer dans « Compte et sécurité » pour accéder au Studio.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { account, user } from "../src/server/db/schema";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!email) {
    console.log("ADMIN_EMAIL absent : aucun compte administrateur à créer.");
    return;
  }
  if (password !== undefined && (password.length < 12 || password.length > 128)) throw new Error("ADMIN_PASSWORD : 12 à 128 caractères.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant");
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
  const db = drizzle(sql, { casing: "snake_case" });
  try {
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (!existing && !password) throw new Error(`Compte ${email} absent : ADMIN_PASSWORD est nécessaire pour le créer.`);
    const hash = password ? await hashPassword(password) : null;
    await db.transaction(async (tx) => {
      const id = existing?.id ?? randomUUID();
      if (existing) {
        await tx.update(user).set({ role: "super_admin", emailVerified: true, status: "active", updatedAt: new Date() }).where(eq(user.id, id));
      } else {
        await tx.insert(user).values({ id, name: process.env.ADMIN_NAME?.trim() || "Administrateur", email, emailVerified: true, role: "super_admin" });
      }
      if (!hash) return;
      // Même forme que l'inscription de Better Auth : fournisseur « credential », accountId = id de l'utilisateur.
      const [credential] = await tx
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, id), eq(account.providerId, "credential")))
        .limit(1);
      if (credential) {
        await tx.update(account).set({ accountId: id, password: hash, updatedAt: new Date() }).where(eq(account.id, credential.id));
      } else {
        await tx.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash });
      }
    });
    const what = existing ? "déjà présent, rôle super_admin confirmé" : "créé (super_admin)";
    console.log(`Compte administrateur ${email} : ${what}${hash ? ", mot de passe = ADMIN_PASSWORD" : ""}.`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
