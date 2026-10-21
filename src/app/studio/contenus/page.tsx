import Link from "next/link";
import { requireStudio } from "@/server/auth/session";
import { listEditableContent } from "@/server/services/studio";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Contenus" };

export const VERSION_LABEL: Record<string, { l: string; t: "neutral" | "signal" | "warn" | "ok" }> = {
  draft: { l: "Brouillon", t: "neutral" },
  technical_review: { l: "Révision technique", t: "signal" },
  pedagogical_review: { l: "Validation pédagogique", t: "warn" },
  published: { l: "Publiée", t: "ok" },
  archived: { l: "Archivée", t: "neutral" },
};

export default async function ContentPage() {
  const { actor } = await requireStudio("/studio/contenus");
  const courses = await listEditableContent(actor);
  return (
    <div className="space-y-8">
      <PageHeader title="Contenus" description="Chaque modification crée une nouvelle version, relue techniquement puis validée pédagogiquement avant publication. Les versions précédentes sont conservées." />
      {!courses.length ? <EmptyState title="Aucune formation ne vous est affectée">Un responsable pédagogique peut vous affecter à une formation.</EmptyState> : null}
      {courses.map((c) => (
        <section key={c.id} aria-labelledby={`c-${c.id}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 id={`c-${c.id}`} className="font-medium">
              {c.title}
            </h2>
            {!c.canEdit ? <Badge>Lecture et validation</Badge> : null}
          </div>
          <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface">
            {c.modules.map((m) => (
              <div key={m.id}>
                <p className="border-b border-line bg-mist/50 px-5 py-2 text-xs text-muted">{m.title}</p>
                <ul className="divide-y divide-line">
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      <Link href={`/studio/contenus/${l.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-mist/40">
                        <span className="text-ink">{l.title}</span>
                        <span className="flex items-center gap-2">
                          {l.latest ? <span className="text-xs text-muted">v{l.latest.version}</span> : null}
                          {l.latest ? <Badge tone={VERSION_LABEL[l.latest.status].t}>{VERSION_LABEL[l.latest.status].l}</Badge> : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
