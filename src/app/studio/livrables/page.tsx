import Link from "next/link";
import { requireStudio } from "@/server/auth/session";
import { listMentorQueue } from "@/server/services/mentoring";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Livrables à relire" };

export default async function MentorQueuePage() {
  const { actor } = await requireStudio("/studio/livrables");
  const queue = await listMentorQueue(actor);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Livrables à relire"
        description="Les plus anciens d'abord. Vous voyez les livrables des formations dont vous êtes mentor ou formateur ; vous ne relisez jamais les vôtres."
      />
      {queue.length ? (
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-line">
            {queue.map((q) => (
              <li key={q.id}>
                <Link href={`/studio/livrables/${q.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm hover:bg-mist/50">
                  <span className="flex-1 text-ink">{q.assignment}</span>
                  <span className="text-ink-2">{q.learner}</span>
                  <span className="text-muted">{formatDate(q.createdAt, { day: "numeric", month: "short" })}</span>
                  {q.status === "in_review" ? <Badge tone={q.reviewerId === actor.id ? "signal" : "neutral"}>{q.reviewerId === actor.id ? "Pris en charge par vous" : "En cours"}</Badge> : <Badge tone="warn">À prendre</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <EmptyState title="Aucun livrable en attente">Les livrables envoyés par les apprenants Academy Pro apparaîtront ici.</EmptyState>
      )}
    </div>
  );
}
