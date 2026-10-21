import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { getDb } from "@/server/db";
import { user, entitlements } from "@/server/db/schema";
import type { Actor } from "@/server/authz/policies";
import { getActor } from "@/server/auth/session";

let prepared = false;

/** Base de test vierge : schéma recréé, migrations, import du contenu. */
export function prepareDatabase() {
  if (prepared) return;
  const url = process.env.DATABASE_URL!;
  if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error("Tests d'intégration : base locale uniquement.");
  execSync(`./scripts/reset-db.sh "${url}"`, { stdio: "pipe" });
  execSync("npx tsx scripts/seed.ts", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
  prepared = true;
}

export async function createUser(opts: { role?: "student" | "trainer" | "mentor" | "pedago_lead" | "super_admin"; tier?: number; mfa?: boolean; name?: string } = {}) {
  const id = randomUUID();
  await getDb()
    .insert(user)
    .values({ id, name: opts.name ?? `Test ${id.slice(0, 6)}`, email: `${id}@test.local`, emailVerified: true, role: opts.role ?? "student", twoFactorEnabled: opts.mfa ?? (opts.role !== undefined && opts.role !== "student") });
  if (opts.tier) await getDb().insert(entitlements).values({ userId: id, source: "manual", sourceRef: "test", tier: opts.tier, active: true });
  return id;
}

export async function actorOf(userId: string): Promise<Actor> {
  const a = await getActor(userId);
  if (!a) throw new Error("acteur introuvable");
  return a;
}
