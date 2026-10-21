import { cn } from "@/lib/cn";

type Domain = { domain: string; label: string; level: number | null; confident: boolean; evidenceCount: number };

/** Barres de compétences par domaine. Un niveau non confirmé (peu de preuves) est affiché en gris. */
export function SkillDomains({ domains, className }: { domains: Domain[]; className?: string }) {
  return (
    <ul className={cn("space-y-3.5", className)}>
      {domains.map((d) => (
        <li key={d.domain}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-2">{d.label}</span>
            <span className="tabular-nums">
              {d.level === null ? <span className="text-muted">Pas encore évalué</span> : <span className="text-ink">{d.level} %</span>}
              {d.level !== null ? (
                <span className="ml-2 text-xs text-muted">
                  {d.evidenceCount} preuve{d.evidenceCount > 1 ? "s" : ""}
                  {!d.confident ? ", à confirmer" : ""}
                </span>
              ) : null}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist" role="img" aria-label={`${d.label} : ${d.level === null ? "non évalué" : `${d.level} %`}`}>
            <div
              className={cn("h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-soft)]", d.confident ? "bg-ok" : "bg-line-strong")}
              style={{ width: `${d.level ?? 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
