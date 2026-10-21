"use client";

/**
 * Cadre commun des schémas interactifs : légende, navigation pas à pas accessible au clavier,
 * description textuelle de l'étape courante (lue par les lecteurs d'écran).
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

export type DiagramStep = { title: string; description: string };

export function useSteps(count: number, { autoplayMs = 0 }: { autoplayMs?: number } = {}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const next = useCallback(() => setStep((s) => Math.min(count - 1, s + 1)), [count]);
  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const reset = useCallback(() => setStep(0), []);
  useEffect(() => {
    if (!playing || reduced) return;
    const ms = autoplayMs || 2200;
    const t = setTimeout(() => {
      if (step >= count - 1) setPlaying(false);
      else setStep((s) => s + 1);
    }, ms);
    return () => clearTimeout(t);
  }, [playing, step, count, autoplayMs, reduced]);
  return { step, setStep, next, prev, reset, playing, setPlaying, reduced: Boolean(reduced) };
}

export function DiagramFrame({
  title,
  steps,
  state,
  children,
  className,
}: {
  title: string;
  steps?: DiagramStep[];
  state?: ReturnType<typeof useSteps>;
  children: ReactNode;
  className?: string;
}) {
  const current = steps && state ? steps[state.step] : undefined;
  return (
    <figure className={cn("overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface", className)}>
      <div className="relative overflow-x-auto px-3 pt-4 sm:px-6" role="img" aria-label={title}>
        <div className="min-w-[440px]">{children}</div>
      </div>
      {steps && state ? (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div aria-live="polite" className="min-h-[2.75rem] text-sm">
            <p className="font-medium text-ink">
              <span className="mr-2 tabular-nums text-muted">
                {state.step + 1}/{steps.length}
              </span>
              {current?.title}
            </p>
            <p className="text-muted">{current?.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={state.prev}
              disabled={state.step === 0}
              className="h-9 rounded-[var(--radius-control)] border border-line px-3 text-sm text-ink-2 transition hover:border-line-strong disabled:opacity-40"
            >
              Précédent
            </button>
            {!state.reduced && (
              <button
                type="button"
                onClick={() => {
                  if (state.step >= steps.length - 1) state.reset();
                  state.setPlaying(!state.playing);
                }}
                className="h-9 rounded-[var(--radius-control)] border border-line px-3 text-sm text-ink-2 transition hover:border-line-strong"
                aria-pressed={state.playing}
              >
                {state.playing ? "Pause" : state.step >= steps.length - 1 ? "Rejouer" : "Lecture"}
              </button>
            )}
            <button
              type="button"
              onClick={state.next}
              disabled={state.step === steps.length - 1}
              className="h-9 rounded-[var(--radius-control)] bg-ink px-3 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      ) : null}
    </figure>
  );
}

/** Petit nœud d'équipement réutilisable (poste, switch, serveur…) dessiné en SVG. */
export function Node({
  x,
  y,
  w = 112,
  h = 52,
  label,
  sub,
  tone = "default",
  active = false,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  sub?: string;
  tone?: "default" | "signal" | "ok" | "warn" | "danger" | "muted";
  active?: boolean;
}) {
  const stroke = {
    default: "var(--line-strong)",
    signal: "var(--signal)",
    ok: "var(--ok)",
    warn: "var(--warn)",
    danger: "var(--danger)",
    muted: "var(--line)",
  }[tone];
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={10}
        fill="var(--surface)"
        stroke={active ? "var(--signal)" : stroke}
        strokeWidth={active ? 2 : 1.25}
      />
      <text x={x} y={sub ? y - 3 : y + 4} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">
        {label}
      </text>
      {sub ? (
        <text x={x} y={y + 14} textAnchor="middle" fontSize={11} fill="var(--muted)" fontFamily="var(--font-mono)">
          {sub}
        </text>
      ) : null}
    </g>
  );
}
