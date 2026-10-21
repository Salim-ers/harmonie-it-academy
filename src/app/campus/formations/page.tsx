import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getCatalog } from "@/server/services/catalog";
import { getProgressMap } from "@/server/services/progress";
import { getUserTier, TIER_LABELS } from "@/server/services/entitlements";
import { Badge, PageHeader, ProgressBar } from "@/components/ui/misc";
import { formatDuration, LEVEL_LABELS } from "@/lib/format";

export const metadata = { title: "Mes formations" };

export default async function FormationsPage() {
  const u = await requireUser("/campus/formations");
  const [catalog, progress, tier] = await Promise.all([getCatalog(), getProgressMap(u.id), getUserTier(u.id)]);
  return (
    <div className="space-y-8">
      <PageHeader title="Mes formations" description="Le parcours Technicien support N1, formation par formation. Les leçons marquées gratuites sont accessibles avec l'offre Découverte." />
      <div className="space-y-4">
        {catalog.map((c) => {
          const lessons = c.modules.flatMap((m) => m.lessons);
          const done = lessons.filter((l) => progress.get(l.id)?.status === "completed").length;
          const free = lessons.filter((l) => l.requiredTier === 0).length;
          return (
            <Link key={c.slug} href={`/campus/formations/${c.slug}`} className="block rounded-[var(--radius-panel)] border border-line bg-surface p-6 transition hover:border-line-strong">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-lg font-semibold tracking-tight text-ink">{c.title}</h2>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted">{c.summary}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Badge>{LEVEL_LABELS[c.level]}</Badge>
                  {tier < c.requiredTier ? <Badge tone="gold">{free ? `${free} leçon${free > 1 ? "s" : ""} gratuite${free > 1 ? "s" : ""}` : TIER_LABELS[c.requiredTier]}</Badge> : null}
                </div>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <ProgressBar value={lessons.length ? (done / lessons.length) * 100 : 0} label={`Progression : ${c.title}`} />
                <span className="shrink-0 text-sm tabular-nums text-muted">
                  {done}/{lessons.length} leçons, {formatDuration(c.durationMin)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
