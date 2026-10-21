import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { notifications, supportMessages, supportTickets, user } from "@/server/db/schema";
import { ForbiddenError, can, type Actor } from "@/server/authz/policies";

export class SupportError extends Error {}

export const TICKET_CATEGORIES = {
  connexion: "Problème de connexion",
  facturation: "Facturation",
  exercice_bloque: "Exercice ou laboratoire bloqué",
  correction_contestee: "Correction contestée",
  question_pedagogique: "Question pédagogique",
  technique: "Dysfonctionnement technique",
  reclamation: "Réclamation",
  accessibilite: "Besoin d'adaptation ou d'accessibilité",
} as const;
export type TicketCategory = keyof typeof TICKET_CATEGORIES;

export async function createTicket(userId: string, input: { category: TicketCategory; subject: string; body: string }, db: Db = getDb()) {
  const [t] = await db.insert(supportTickets).values({ userId, category: input.category, subject: input.subject }).returning({ id: supportTickets.id });
  await db.insert(supportMessages).values({ ticketId: t.id, authorId: userId, body: input.body });
  return t.id;
}

async function ticketFor(db: Db, actor: Actor, ticketId: string) {
  const [t] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  if (!t || (t.userId !== actor.id && !can.manageSupportTickets(actor))) throw new ForbiddenError("Ce ticket n'existe pas ou ne vous appartient pas.");
  return t;
}

export async function getTicket(actor: Actor, ticketId: string, db: Db = getDb()) {
  const t = await ticketFor(db, actor, ticketId);
  const msgs = await db
    .select({ id: supportMessages.id, body: supportMessages.body, createdAt: supportMessages.createdAt, authorId: supportMessages.authorId, authorName: user.name })
    .from(supportMessages)
    .leftJoin(user, eq(user.id, supportMessages.authorId))
    .where(eq(supportMessages.ticketId, t.id))
    .orderBy(asc(supportMessages.createdAt));
  return { ticket: t, messages: msgs.map((m) => ({ ...m, fromStaff: m.authorId !== t.userId })) };
}

export async function replyTicket(actor: Actor, ticketId: string, body: string, db: Db = getDb()) {
  const t = await ticketFor(db, actor, ticketId);
  if (t.status === "closed") throw new SupportError("Ce ticket est clôturé : ouvrez-en un nouveau.");
  await db.insert(supportMessages).values({ ticketId, authorId: actor.id, body });
  const staff = actor.id !== t.userId;
  await db.update(supportTickets).set({ status: staff ? "pending" : "open", updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
  if (staff) {
    await db.insert(notifications).values({ userId: t.userId, kind: "support", title: `Réponse à votre demande : ${t.subject}`, href: `/campus/support/${t.id}` });
  }
}

export async function setTicketStatus(actor: Actor, ticketId: string, status: "open" | "pending" | "resolved" | "closed", db: Db = getDb()) {
  const t = await ticketFor(db, actor, ticketId);
  if (actor.id === t.userId && !["resolved", "closed"].includes(status)) throw new ForbiddenError();
  await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
}

export async function listMyTickets(userId: string, db: Db = getDb()) {
  return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.updatedAt));
}

export async function listAllTickets(actor: Actor, db: Db = getDb()) {
  if (!can.manageSupportTickets(actor)) throw new ForbiddenError();
  return db
    .select({ id: supportTickets.id, subject: supportTickets.subject, category: supportTickets.category, status: supportTickets.status, updatedAt: supportTickets.updatedAt, userName: user.name })
    .from(supportTickets)
    .innerJoin(user, eq(user.id, supportTickets.userId))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(200);
}
