import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth } from "./auth";
import { getDb } from "@/server/db";
import { courseStaff, organizationMembers, user as userTable, type UserRole } from "@/server/db/schema";
import { can, type Actor } from "@/server/authz/policies";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
};

/**
 * Couche d'accès aux sessions (DAL). La session est toujours relue côté serveur :
 * le proxy ne fait qu'une redirection optimiste, il ne protège rien à lui seul.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const s = await getAuth().api.getSession({ headers: await headers() });
  if (!s) return null;
  // Relecture en base : un rôle ou une suspension changés prennent effet immédiatement.
  const [u] = await getDb()
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      status: userTable.status,
      emailVerified: userTable.emailVerified,
      twoFactorEnabled: userTable.twoFactorEnabled,
    })
    .from(userTable)
    .where(eq(userTable.id, s.user.id))
    .limit(1);
  if (!u || u.status !== "active") return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, emailVerified: u.emailVerified, twoFactorEnabled: Boolean(u.twoFactorEnabled) };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect(next ? `/connexion?suite=${encodeURIComponent(next)}` : "/connexion");
  return u;
}

export const getActor = cache(async (userId: string): Promise<Actor | null> => {
  const db = getDb();
  const [u] = await db
    .select({ id: userTable.id, role: userTable.role, status: userTable.status, twoFactorEnabled: userTable.twoFactorEnabled })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!u) return null;
  const [orgs, staff] = await Promise.all([
    db.select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role }).from(organizationMembers).where(eq(organizationMembers.userId, userId)),
    db.select({ courseId: courseStaff.courseId, role: courseStaff.role }).from(courseStaff).where(eq(courseStaff.userId, userId)),
  ]);
  return { id: u.id, role: u.role, status: u.status, twoFactorEnabled: Boolean(u.twoFactorEnabled), organizations: orgs, courseStaff: staff };
});

export async function requireActor(next?: string): Promise<{ user: CurrentUser; actor: Actor }> {
  const user = await requireUser(next);
  const actor = await getActor(user.id);
  if (!actor) redirect("/connexion");
  return { user, actor };
}

/** Accès au Studio : rôle d'équipe obligatoire, puis double authentification obligatoire. */
export async function requireStudio(next = "/studio"): Promise<{ user: CurrentUser; actor: Actor }> {
  const ctx = await requireActor(next);
  if (!can.isStaffRole(ctx.actor)) redirect("/campus");
  if (!ctx.actor.twoFactorEnabled) redirect("/campus/securite?mfa=obligatoire");
  return ctx;
}
