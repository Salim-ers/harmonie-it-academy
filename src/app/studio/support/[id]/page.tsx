import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStudio } from "@/server/auth/session";
import { getTicket, TICKET_CATEGORIES } from "@/server/services/support";
import { ForbiddenError } from "@/server/authz/policies";
import { StaffTicketThread } from "@/components/studio/staff-ticket";

export default async function StudioTicket(props: PageProps<"/studio/support/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { actor } = await requireStudio();
  let t;
  try {
    t = await getTicket(actor, id);
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.ticket.subject}</h1>
        <p className="mt-1 text-sm text-muted">{TICKET_CATEGORIES[t.ticket.category]}</p>
      </div>
      <StaffTicketThread ticketId={t.ticket.id} messages={t.messages} status={t.ticket.status} />
    </div>
  );
}
