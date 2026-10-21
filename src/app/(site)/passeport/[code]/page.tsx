import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { getPublicPassport } from "@/server/services/career";
import { SkillDomains } from "@/components/campus/skill-domains";
import { Monogram } from "@/components/brand/logo";
import { Badge } from "@/components/ui/misc";
import { formatDate, SECTOR_LABELS } from "@/lib/format";
import { formatCode } from "@/lib/codes-client";

export const metadata = { title: "Passeport de compétences", robots: { index: false, follow: false } };

async function Passport({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const p = await getPublicPassport(code);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-14 sm:px-6">
      <header className="flex items-start justify-between gap-6 border-b border-line pb-8">
        <div>
          <p className="text-sm text-muted">Passeport de compétences Harmonie IT Academy</p>
          <h1 className="mt-2 font-display text-5xl leading-tight">{p.displayName}</h1>
          {p.headline ? <p className="mt-2 text-lg text-ink-2">{p.headline}</p> : null}
          <p className="mt-3 text-sm text-muted">Mis à jour le {formatDate(p.updatedAt)}</p>
        </div>
        <Monogram tone="gold" className="h-12 w-12" />
      </header>
      <section className="grid gap-8 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="font-medium">Compétences par domaine</h2>
          <SkillDomains domains={p.domains} className="mt-4" />
          <p className="mt-4 text-xs text-muted">Niveaux calculés à partir de résultats réels (quiz, exercices, laboratoires, entretiens simulés, examens). « À confirmer » signale un nombre de preuves encore limité.</p>
        </div>
        <div>
          <h2 className="font-medium">Détail</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {p.skills.map((s) => (
              <li key={s.code} className="flex justify-between gap-4 py-2">
                <span className="text-ink-2">{s.name}</span>
                <span className="shrink-0 tabular-nums">
                  {s.level} % <span className="text-xs text-muted">({s.evidenceCount})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      {p.attestations.length ? (
        <section>
          <h2 className="font-medium">Attestations</h2>
          <ul className="mt-3 space-y-2">
            {p.attestations.map((a) => (
              <li key={a.code} className="flex flex-wrap items-center gap-3 text-[15px]">
                <BadgeCheck className="h-4 w-4 text-gold" aria-hidden="true" />
                {a.title}
                <a href={`/verifier/${a.code}`} className="font-mono text-sm underline underline-offset-4">
                  {formatCode(a.code)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {p.portfolio.length ? (
        <section>
          <h2 className="font-medium">Incidents traités (portfolio)</h2>
          <ul className="mt-4 space-y-4">
            {p.portfolio.map((x) => (
              <li key={x.id} className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{x.title}</p>
                  <div className="flex gap-1.5">
                    <Badge>{SECTOR_LABELS[x.sector] ?? x.sector}</Badge>
                    <Badge tone={x.resolved ? "ok" : "warn"}>{x.score} / 100</Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {x.steps} étapes de diagnostic, le {formatDate(x.endedAt)}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{x.closingNote}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Incidents simulés dans des entreprises fictives ; notes de clôture rédigées par le titulaire.</p>
        </section>
      ) : null}
    </div>
  );
}

export default function PublicPassportPage(props: PageProps<"/passeport/[code]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-4xl animate-pulse bg-mist" />}>
      <Passport params={props.params} />
    </Suspense>
  );
}
