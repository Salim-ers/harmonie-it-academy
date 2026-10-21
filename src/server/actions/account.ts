"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { user, userProfiles } from "@/server/db/schema";
import { run } from "./result";
import { recordAudit } from "@/server/services/audit";
import { markNotificationsRead } from "@/server/services/notifications";

export async function updateProfileAction(input: { name: string; weeklyGoalMinutes: number; accessibilityNeeds: string; leaderboardOptIn: boolean }) {
  return run(async () => {
    const u = await requireUser();
    const p = z
      .object({ name: z.string().trim().min(2).max(80), weeklyGoalMinutes: z.number().int().min(30).max(1200), accessibilityNeeds: z.string().max(1000), leaderboardOptIn: z.boolean() })
      .parse(input);
    const db = getDb();
    await db.update(user).set({ name: p.name, updatedAt: new Date() }).where(eq(user.id, u.id));
    await db
      .insert(userProfiles)
      .values({ userId: u.id, weeklyGoalMinutes: p.weeklyGoalMinutes, accessibilityNeeds: p.accessibilityNeeds, leaderboardOptIn: p.leaderboardOptIn })
      .onConflictDoUpdate({ target: userProfiles.userId, set: { weeklyGoalMinutes: p.weeklyGoalMinutes, accessibilityNeeds: p.accessibilityNeeds, leaderboardOptIn: p.leaderboardOptIn, updatedAt: new Date() } });
    refresh();
  });
}

export async function auditSecurityEventAction(action: "auth.2fa_enabled" | "auth.2fa_disabled" | "auth.sessions_revoked" | "auth.account_deleted_request") {
  return run(async () => {
    const u = await requireUser();
    await recordAudit({ actorId: u.id, action, targetType: "user", targetId: u.id });
  });
}

export async function markNotificationsReadAction() {
  return run(async () => {
    const u = await requireUser();
    await markNotificationsRead(u.id);
    refresh();
  });
}
