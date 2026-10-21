import { cn } from "@/lib/cn";

/**
 * Monogramme Harmonie : un H dessiné en filets parallèles, repris de l'identité de Harmonie Solutions.
 * `tone="gold"` pour les contextes de marque (pied de page, attestations), `ink` dans l'interface.
 */
export function Monogram({ className, tone = "ink", title }: { className?: string; tone?: "ink" | "gold" | "paper"; title?: string }) {
  const color = tone === "gold" ? "var(--gold-bright)" : tone === "paper" ? "var(--paper)" : "currentColor";
  return (
    <svg viewBox="0 0 40 40" className={cn("h-7 w-7", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="square">
        <path d="M5 4h11M5 36h11M24 4h11M24 36h11" />
        <path d="M8 4v32M12.5 4v32M27.5 4v32M32 4v32" />
        <path d="M12.5 17h15M12.5 23h15" />
      </g>
    </svg>
  );
}

export function Wordmark({ name = "Harmonie IT Academy", className }: { name?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-ink", className)}>
      <Monogram />
      <span className="text-[15px] font-semibold tracking-tight">{name}</span>
    </span>
  );
}
