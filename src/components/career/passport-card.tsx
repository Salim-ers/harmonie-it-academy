import { BadgeCheck, FileCheck2 } from "lucide-react";
import { Monogram } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

export type PassportCardData = {
  displayName: string;
  headline: string;
  domains: { label: string; level: number | null; confident: boolean; evidenceCount: number }[];
  attestations: { title: string; code: string }[];
  incidents: number;
  verifiedAt?: string;
};

/** Carte « passeport de compétences » : niveaux issus de preuves, nombre de preuves visible. */
export function PassportCard({ data, sample = false, className }: { data: PassportCardData; sample?: boolean; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <p className="text-xs text-muted">Passeport de compétences{sample ? ", exemple" : ""}</p>
          <p className="mt-1 text-lg font-semibold text-ink">{data.displayName}</p>
          {data.headline ? <p className="text-sm text-muted">{data.headline}</p> : null}
        </div>
        <Monogram className="h-8 w-8 text-gold" tone="gold" />
      </div>
      <div className="space-y-3 px-5 py-4">
        {data.domains.map((d) => (
          <div key={d.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-2">{d.label}</span>
              <span className="tabular-nums text-ink">
                {d.level === null ? "—" : `${d.level} %`}
                <span className="ml-2 text-xs text-muted">
                  {d.evidenceCount} preuve{d.evidenceCount > 1 ? "s" : ""}
                  {d.level !== null && !d.confident ? ", à confirmer" : ""}
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
              <div className={cn("h-full rounded-full", d.confident ? "bg-ok" : "bg-line-strong")} style={{ width: `${d.level ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line bg-paper/60 px-5 py-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          <FileCheck2 className="h-4 w-4 text-signal" aria-hidden="true" />
          {data.incidents} incident{data.incidents > 1 ? "s" : ""} documenté{data.incidents > 1 ? "s" : ""}
        </span>
        {data.attestations.map((a) => (
          <span key={a.code} className="inline-flex items-center gap-1.5 text-ink-2">
            <BadgeCheck className="h-4 w-4 text-gold" aria-hidden="true" />
            {a.title}
          </span>
        ))}
      </div>
    </div>
  );
}
