import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { frenchSpacing } from "@/lib/typography";

export function Panel({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" | "aside" }) {
  return <Tag className={cn("rounded-[var(--radius-panel)] border border-line bg-surface", className)}>{children}</Tag>;
}

type Tone = "neutral" | "signal" | "ok" | "warn" | "danger" | "gold";
const tones: Record<Tone, string> = {
  neutral: "bg-mist text-ink-2",
  signal: "bg-signal-wash text-signal-ink",
  ok: "bg-ok-wash text-ok",
  warn: "bg-warn-wash text-warn",
  danger: "bg-danger-wash text-danger",
  gold: "bg-gold-wash text-gold",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function ProgressBar({ value, label, tone = "ok", className }: { value: number; label: string; tone?: "ok" | "signal" | "gold"; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color = { ok: "bg-ok", signal: "bg-signal", gold: "bg-gold-bright" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-mist", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-soft)]", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function PageHeader({ title, description, actions, kicker }: { title: string; description?: ReactNode; actions?: ReactNode; kicker?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-2">
        {kicker ? <div className="text-sm text-muted">{kicker}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description ? <div className="text-[15px] leading-relaxed text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1.5 max-w-md text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      {sub ? <p className="text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

/** Mise en forme légère et sûre : **gras**, *italique*, `code`. Aucun HTML interprété. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(frenchSpacing(text.slice(last, m.index)));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={i++}>{frenchSpacing(tok.slice(2, -2))}</strong>);
    else if (tok.startsWith("`")) parts.push(<code key={i++} className="inline-code">{tok.slice(1, -1)}</code>);
    else parts.push(<em key={i++}>{frenchSpacing(tok.slice(1, -1))}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(frenchSpacing(text.slice(last)));
  return <span className={className}>{parts}</span>;
}
