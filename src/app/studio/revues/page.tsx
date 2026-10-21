import Link from "next/link";
import { requireStudio } from "@/server/auth/session";
import { listReviewQueue } from "@/server/services/studio";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { VERSION_LABEL } from "../contenus/page";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Relectures" };

export default async function ReviewsPage() {
  const { actor } = await requireStudio("/studio/revues");
  const queue = await listReviewQueue(actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Relectures" description="Versions en cours de circuit. Vous ne pouvez pas relire une version dont vous êtes l'auteur." />
      {queue.length ? (
        <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface text-sm">
          {queue.map((q) => (
            <li key={q.id}>
              <Link href={`/studio/contenus/${q.lessonId}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-mist/40">
                <span>
                  <span className="text-ink">{q.title}</span>
                  <span className="ml-2 text-xs text-muted">
                    v{q.version}, {q.authorName ?? "import"}, {formatDate(q.createdAt, { day: "numeric", month: "short" })}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={VERSION_LABEL[q.status].t}>{VERSION_LABEL[q.status].l}</Badge>
                  {q.canAct ? <Badge tone="signal">À traiter</Badge> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Rien à relire">Les versions soumises apparaîtront ici.</EmptyState>
      )}
    </div>
  );
}
