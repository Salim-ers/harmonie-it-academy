import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { notifications } from "@/server/db/schema";

export async function listUnreadNotifications(userId: string, db: Db = getDb()) {
  return db
    .select({ id: notifications.id, title: notifications.title, href: notifications.href, createdAt: notifications.createdAt })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .orderBy(desc(notifications.createdAt))
    .limit(5);
}

export async function markNotificationsRead(userId: string, db: Db = getDb()) {
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
