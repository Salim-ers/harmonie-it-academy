import "server-only";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { entitlements } from "@/server/db/schema";

export const TIER_LABELS = ["Découverte", "Academy", "Academy Pro"] as const;

/** Niveau d'accès effectif : le plus élevé des droits actifs et non expirés (0 si aucun). */
export async function getUserTier(userId: string, db: Db = getDb()): Promise<number> {
  const [row] = await db
    .select({ tier: sql<number>`coalesce(max(${entitlements.tier}), 0)` })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.active, true),
        or(isNull(entitlements.validUntil), gt(entitlements.validUntil, new Date())),
      ),
    );
  return Number(row?.tier ?? 0);
}

export async function upsertEntitlement(
  db: Db,
  e: { userId: string; source: "subscription" | "organization" | "manual"; sourceRef: string; tier: number; validUntil: Date | null; active: boolean },
) {
  await db
    .insert(entitlements)
    .values({ ...e, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [entitlements.userId, entitlements.source, entitlements.sourceRef],
      set: { tier: e.tier, validUntil: e.validUntil, active: e.active, updatedAt: new Date() },
    });
}

export function hasAccess(userTier: number, requiredTier: number) {
  return userTier >= requiredTier;
}
