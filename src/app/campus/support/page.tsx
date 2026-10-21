import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listMyTickets, TICKET_CATEGORIES } from "@/server/services/support";
import { TicketForm } from "@/components/support/ticket-form";
import { Badge, PageHeader, Panel } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Aide et support" };
export const STATUS_LABEL: Record<string, { l: string; t: "signal" | "warn" | "ok" | "neutral" }> = {
  open: { l: "Ouverte", t: "signal" },
  pending: { l: "Réponse reçue", t: "warn" },
  resolved: { l: "Résolue", t: "ok" },
  closed: { l: "Clôturée", t: "neutral" },
};

export default async function SupportPage() {
  const u = await requireUser("/campus/support");
  const tickets = await listMyTickets(u.id);
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Aide et support" description="Une question sur un cours, une correction à contester, un souci de connexion ou de facturation : l'équipe vous répond ici." />
      <Panel className="p-6" as="section">
        <h2 className="mb-4 font-medium">Nouvelle demande</h2>
        <TicketForm categories={TICKET_CATEGORIES} />
      </Panel>
      {tickets.length ? (
        <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface text-sm">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/campus/support/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-mist/50">
                <span className="text-ink">{t.subject}</span>
                <span className="flex items-center gap-3 text-muted">
                  {formatDate(t.updatedAt, { day: "numeric", month: "short" })}
                  <Badge tone={STATUS_LABEL[t.status].t}>{STATUS_LABEL[t.status].l}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
