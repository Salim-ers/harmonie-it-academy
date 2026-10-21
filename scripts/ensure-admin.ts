/**
 * Crée le compte administrateur décrit par ADMIN_EMAIL / ADMIN_PASSWORD (facultatif, idempotent).
 *
 *   npx tsx scripts/ensure-admin.ts
 *
 * - compte absent : créé avec l'adresse déjà vérifiée (aucun e-mail nécessaire) et le rôle super_admin ;
 * - compte existant : promu super_admin et adresse marquée vérifiée ; le mot de passe n'est jamais réécrit.
 * La double authentification reste à activer dans « Compte et sécurité » pour accéder au Studio.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { account, user } from "../src/server/db/schema";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email) {
    console.log("ADMIN_EMAIL absent : aucun compte administrateur à créer.");
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant");
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
  const db = drizzle(sql, { casing: "snake_case" });
  try {
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (existing) {
      await db.update(user).set({ role: "super_admin", emailVerified: true, status: "active", updatedAt: new Date() }).where(eq(user.id, existing.id));
      console.log(`Compte administrateur ${email} : déjà présent, rôle super_admin confirmé.`);
      return;
    }
    if (!password || password.length < 12 || password.length > 128) throw new Error("ADMIN_PASSWORD : 12 à 128 caractères.");
    const id = randomUUID();
    const hash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await tx.insert(user).values({ id, name: process.env.ADMIN_NAME?.trim() || "Administrateur", email, emailVerified: true, role: "super_admin" });
      await tx.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash });
    });
    console.log(`Compte administrateur ${email} créé (super_admin).`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
