import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Lock } from "lucide-react";
import { getCatalog, getCourse } from "@/server/services/catalog";
import { PageIntro } from "@/components/marketing/page-intro";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { formatDuration, LEVEL_LABELS } from "@/lib/format";

export async function generateStaticParams() {
  return (await getCatalog()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<"/formations/[slug]">): Promise<Metadata> {
  const c = await getCourse((await props.params).slug);
  return c ? { title: c.title, description: c.summary } : {};
}

export default async function CoursePublicPage(props: PageProps<"/formations/[slug]">) {
  const c = await getCourse((await props.params).slug);
  if (!c) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.title,
    description: c.summary,
    inLanguage: "fr",
    provider: { "@type": "Organization", name: "Harmonie IT Academy" },
    educationalLevel: LEVEL_LABELS[c.level],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageIntro
        title={c.title}
        aside={
          <div className="space-y-3 rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <div className="flex flex-wrap gap-1.5">
              <Badge>{LEVEL_LABELS[c.level]}</Badge>
              <Badge>{c.lessonCount} leçons</Badge>
              <Badge>{formatDuration(c.durationMin)}</Badge>
            </div>
            <ButtonLink href={`/inscription?suite=/campus/formations/${c.slug}`} className="w-full">
              Commencer gratuitement
            </ButtonLink>
            <p className="text-xs text-muted">Les leçons marquées « gratuite » sont accessibles avec l&apos;offre Découverte ; les autres avec Academy.</p>
          </div>
        }
      >
        {c.summary}
      </PageIntro>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {c.modules.map((m, i) => (
            <div key={m.id}>
              <h2 className="text-sm text-muted">
                Module {i + 1}. <span className="font-medium text-ink">{m.title}</span>
              </h2>
              <ol className="mt-3 divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
                {m.lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-3.5 text-[15px]">
                    {l.requiredTier === 0 ? <CheckCircle2 className="h-4 w-4 text-ok" aria-label="Gratuite" /> : <Lock className="h-4 w-4 text-muted" aria-label="Offre Academy" />}
                    <span className="flex-1">{l.title}</span>
                    {l.requiredTier === 0 ? <span className="rounded-full bg-ok-wash px-2 py-0.5 text-xs font-medium text-ok">gratuite</span> : null}
                    <span className="text-sm text-muted">{formatDuration(l.durationMin)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <aside className="space-y-3">
          <h2 className="font-medium">Objectifs</h2>
          <ul className="space-y-2 text-[15px] text-ink-2">
            {c.objectives.map((o) => (
              <li key={o} className="flex gap-2">
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
                {o}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </>
  );
}
