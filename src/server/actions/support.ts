"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireActor, requireUser } from "@/server/auth/session";
import { run } from "./result";
import { createTicket, replyTicket, setTicketStatus, TICKET_CATEGORIES, type TicketCategory } from "@/server/services/support";
import { consumeRateLimit } from "@/server/services/rate-limit";

const categories = Object.keys(TICKET_CATEGORIES) as [TicketCategory, ...TicketCategory[]];

export async function createTicketAction(_prev: unknown, form: FormData) {
  const u = await requireUser("/campus/support");
  const p = z
    .object({ category: z.enum(categories), subject: z.string().trim().min(4, "Précisez l'objet de votre demande.").max(160), body: z.string().trim().min(10, "Décrivez votre demande en quelques phrases.").max(5000) })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    await consumeRateLimit(`ticket:${u.id}`, 10, 86400);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const id = await createTicket(u.id, p.data);
  redirect(`/campus/support/${id}`);
}

export async function replyTicketAction(ticketId: string, body: string) {
  return run(async () => {
    const { actor } = await requireActor();
    await consumeRateLimit(`ticket-reply:${actor.id}`, 60, 3600);
    await replyTicket(actor, z.uuid().parse(ticketId), z.string().trim().min(1).max(5000).parse(body));
    refresh();
  });
}

export async function setTicketStatusAction(ticketId: string, status: "open" | "pending" | "resolved" | "closed") {
  return run(async () => {
    const { actor } = await requireActor();
    await setTicketStatus(actor, z.uuid().parse(ticketId), z.enum(["open", "pending", "resolved", "closed"]).parse(status));
    refresh();
  });
}
