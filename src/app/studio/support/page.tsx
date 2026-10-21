import Link from "next/link";
import { requireStudio } from "@/server/auth/session";
import { listAllTickets, TICKET_CATEGORIES } from "@/server/services/support";
import { can } from "@/server/authz/policies";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABEL } from "@/app/campus/support/page";

export const metadata = { title: "Support" };

export default async function StudioSupport() {
  const { actor } = await requireStudio("/studio/support");
  if (!can.manageSupportTickets(actor)) return <EmptyState title="Accès réservé">Le support est traité par les mentors et le responsable pédagogique.</EmptyState>;
  const tickets = await listAllTickets(actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Support" description="Demandes des apprenants, dont les réclamations (suivies dans les indicateurs qualité)." />
      <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface text-sm">
        {tickets.map((t) => (
          <li key={t.id}>
            <Link href={`/studio/support/${t.id}`} className="grid gap-1 px-5 py-3 hover:bg-mist/40 sm:grid-cols-[1fr_auto] sm:items-center">
              <span>
                <span className="text-ink">{t.subject}</span>
                <span className="ml-2 text-xs text-muted">
                  {t.userName}, {TICKET_CATEGORIES[t.category]}
                </span>
              </span>
              <span className="flex items-center gap-3 text-muted">
                {formatDateTime(t.updatedAt)}
                <Badge tone={t.category === "reclamation" ? "danger" : STATUS_LABEL[t.status].t}>{STATUS_LABEL[t.status].l}</Badge>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
