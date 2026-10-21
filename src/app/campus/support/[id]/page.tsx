import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { requireActor } from "@/server/auth/session";
import { getTicket, TICKET_CATEGORIES } from "@/server/services/support";
import { ForbiddenError } from "@/server/authz/policies";
import { TicketThread } from "@/components/support/ticket-thread";

export default async function TicketPage(props: PageProps<"/campus/support/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { actor } = await requireActor(`/campus/support/${id}`);
  let t;
  try {
    t = await getTicket(actor, id);
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  if (t.ticket.userId !== actor.id) notFound();
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/campus/support" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Aide et support
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.ticket.subject}</h1>
        <p className="mt-1 text-sm text-muted">{TICKET_CATEGORIES[t.ticket.category]}</p>
      </div>
      <TicketThread ticketId={t.ticket.id} messages={t.messages} status={t.ticket.status} staffView={false} />
    </div>
  );
}
