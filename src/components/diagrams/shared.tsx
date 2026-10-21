"use client";

/**
 * Utilitaires partagés par les schémas interactifs : boîtes, flèches, jetons animés,
 * groupes de boutons accessibles, panneau d'explication et cadre avec zone de contrôles.
 * Le cadre `DiagramShell` reprend exactement l'apparence de `DiagramFrame`, mais place les
 * contrôles HTML hors de la zone `role="img"` pour qu'ils restent accessibles.
 */
import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import type { DiagramStep, useSteps } from "./frame";

export type Pt = { x: number; y: number };
export type Tone = "default" | "signal" | "ok" | "warn" | "danger" | "muted";
export type StepsState = ReturnType<typeof useSteps>;

export const MONO = "var(--font-mono)";

export const STROKE: Record<Tone, string> = {
  default: "var(--line-strong)",
  signal: "var(--signal)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  muted: "var(--line)",
};

export const WASH: Record<Tone, string> = {
  default: "var(--surface)",
  signal: "var(--signal-wash)",
  ok: "var(--ok-wash)",
  warn: "var(--warn-wash)",
  danger: "var(--danger-wash)",
  muted: "var(--mist)",
};

/** Largeur approximative d'un texte SVG (police Geist), pour dimensionner les pastilles. */
export function textWidth(text: string, { size = 12, mono = false, bold = false }: { size?: number; mono?: boolean; bold?: boolean } = {}) {
  const ratio = mono ? 0.6 : bold ? 0.6 : 0.56;
  return Math.ceil(text.length * size * ratio);
}

/* ------------------------------------------------------------------ Formes SVG */

/** Boîte d'équipement ou d'étape. `label` accepte des retours à la ligne (\n). */
export function Box({
  x,
  y,
  w = 112,
  h = 48,
  label,
  sub,
  tone = "default",
  active = false,
  wash = false,
  fill,
  monoSub = false,
  monoLabel = false,
  dashed = false,
  dim = false,
  labelSize = 13,
  rx = 10,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  sub?: string;
  tone?: Tone;
  active?: boolean;
  /** Remplit la boîte avec la teinte claire du ton (ou du signal si active). */
  wash?: boolean;
  fill?: string;
  monoSub?: boolean;
  monoLabel?: boolean;
  dashed?: boolean;
  dim?: boolean;
  labelSize?: number;
  rx?: number;
}) {
  const lines = label.split("\n");
  const stroke = active ? "var(--signal)" : STROKE[tone];
  const background = fill ?? (wash ? (active ? "var(--signal-wash)" : WASH[tone]) : "var(--surface)");
  const count = lines.length + (sub ? 1 : 0);
  const lh = 15;
  const first = y - ((count - 1) * lh) / 2 + 4.5;
  return (
    <g opacity={dim ? 0.45 : 1} className="motion-safe:transition-opacity motion-safe:duration-300">
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={rx}
        fill={background}
        stroke={stroke}
        strokeWidth={active ? 2 : 1.25}
        strokeDasharray={dashed ? "4 3" : undefined}
        className="motion-safe:transition-colors motion-safe:duration-300"
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={first + i * lh}
          textAnchor="middle"
          fontSize={labelSize}
          fontWeight={600}
          fill="var(--ink)"
          fontFamily={monoLabel ? MONO : undefined}
        >
          {line}
        </text>
      ))}
      {sub ? (
        <text
          x={x}
          y={first + lines.length * lh}
          textAnchor="middle"
          fontSize={12}
          fill="var(--muted)"
          fontFamily={monoSub ? MONO : undefined}
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

/** Texte SVG court (12 px par défaut, couleur atténuée). */
export function Label({
  x,
  y,
  children,
  size = 12,
  anchor = "middle",
  weight,
  color = "var(--muted)",
  mono = false,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  color?: string;
  mono?: boolean;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color} fontFamily={mono ? MONO : undefined}>
      {children}
    </text>
  );
}

export function ArrowHead({ at, angle, color = "var(--line-strong)", size = 7 }: { at: Pt; angle: number; color?: string; size?: number }) {
  const back = { x: at.x - Math.cos(angle) * size, y: at.y - Math.sin(angle) * size };
  const half = size * 0.55;
  const nx = -Math.sin(angle) * half;
  const ny = Math.cos(angle) * half;
  const points = `${at.x},${at.y} ${back.x + nx},${back.y + ny} ${back.x - nx},${back.y - ny}`;
  return <polygon points={points} fill={color} />;
}

/** Segment droit avec pointe(s) de flèche. */
export function Arrow({
  from,
  to,
  color = "var(--line-strong)",
  width = 1.5,
  dashed = false,
  head = true,
  tail = false,
}: {
  from: Pt;
  to: Pt;
  color?: string;
  width?: number;
  dashed?: boolean;
  head?: boolean;
  tail?: boolean;
}) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const inset = 5;
  const a = tail ? { x: from.x + Math.cos(angle) * inset, y: from.y + Math.sin(angle) * inset } : from;
  const b = head ? { x: to.x - Math.cos(angle) * inset, y: to.y - Math.sin(angle) * inset } : to;
  return (
    <g>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dashed ? "5 4" : undefined}
        className="motion-safe:transition-colors motion-safe:duration-300"
      />
      {head ? <ArrowHead at={to} angle={angle} color={color} /> : null}
      {tail ? <ArrowHead at={from} angle={angle + Math.PI} color={color} /> : null}
    </g>
  );
}

/** Point du bord d'une boîte (centre c, taille w × h) dans la direction d'une cible, avec une marge. */
export function edge(c: Pt, w: number, h: number, toward: Pt, pad = 4): Pt {
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const sx = dx === 0 ? Infinity : (w / 2 + pad) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (h / 2 + pad) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/* ------------------------------------------------------------------ Animation */

/** Petit point qui parcourt un chemin (transition d'état). Sans animation : rien n'est affiché. */
export function TravelDot({ path, reduced, color = "var(--signal)", duration = 0.9, delay = 0, r = 5 }: { path: Pt[]; reduced: boolean; color?: string; duration?: number; delay?: number; r?: number }) {
  if (reduced || path.length < 2) return null;
  return (
    <motion.circle
      r={r}
      fill={color}
      initial={{ cx: path[0].x, cy: path[0].y, opacity: 0 }}
      animate={{ cx: path.map((p) => p.x), cy: path.map((p) => p.y), opacity: path.map((_, i) => (i === path.length - 1 ? 0 : 1)) }}
      transition={{ duration, delay, ease: "easeInOut" }}
    />
  );
}

/** Pastille (message, paquet, ticket) qui suit un chemin de points. Sans animation : posée à l'arrivée. */
export function Token({
  path,
  label,
  reduced,
  color = "var(--signal)",
  textColor = "var(--paper)",
  duration = 1.2,
  delay = 0,
  mono = false,
  w,
  h = 24,
  fade = false,
}: {
  path: Pt[];
  label: string;
  reduced: boolean;
  /** Disparaît à l'arrivée (message transitoire). Sans animation : rien n'est affiché. */
  fade?: boolean;
  color?: string;
  textColor?: string;
  duration?: number;
  delay?: number;
  mono?: boolean;
  w?: number;
  h?: number;
}) {
  const base = path.length === 1 ? [path[0], path[0]] : path;
  if (fade && reduced) return null;
  const last = base[base.length - 1];
  /* Pour un message transitoire, on ajoute un dernier point immobile pendant lequel il s'efface. */
  const pts = fade ? [...base, last] : base;
  const width = w ?? textWidth(label, { mono, bold: !mono }) + 20;
  const lengths = base.map((p, i) => (i === 0 ? 0 : Math.hypot(p.x - base[i - 1].x, p.y - base[i - 1].y)));
  const total = lengths.reduce((a, b) => a + b, 0);
  const span = fade ? 0.82 : 1;
  const times = lengths.map((_, i) => {
    const done = lengths.slice(0, i + 1).reduce((a, b) => a + b, 0);
    return (total === 0 ? i / (base.length - 1) : done / total) * span;
  });
  if (fade) times.push(1);
  return (
    <motion.g
      initial={reduced ? false : { x: pts[0].x, y: pts[0].y, opacity: 0 }}
      animate={
        reduced
          ? { x: last.x, y: last.y, opacity: 1 }
          : { x: pts.map((p) => p.x), y: pts.map((p) => p.y), opacity: pts.map((_, i) => (i === 0 || (fade && i === pts.length - 1) ? 0 : 1)) }
      }
      transition={{ duration, delay, ease: "easeInOut", times }}
    >
      <rect x={-width / 2} y={-h / 2} width={width} height={h} rx={h / 2} fill={color} />
      <text x={0} y={4} textAnchor="middle" fontSize={12} fontWeight={600} fill={textColor} fontFamily={mono ? MONO : undefined}>
        {label}
      </text>
    </motion.g>
  );
}

/** Fait apparaître son contenu (fondu et léger glissement). À re-clé par étape pour rejouer. */
export function Appear({
  reduced,
  delay = 0,
  duration = 0.45,
  dx = 0,
  dy = 6,
  children,
}: {
  reduced: boolean;
  delay?: number;
  duration?: number;
  dx?: number;
  dy?: number;
  children: ReactNode;
}) {
  return (
    <motion.g
      initial={reduced ? false : { opacity: 0, x: dx, y: dy }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.g>
  );
}

/** Anneau qui s'étend autour d'un point (diffusion, alerte). Rien en mouvement réduit. */
export function Ripple({ at, reduced, color = "var(--signal)", r = 28, delay = 0 }: { at: Pt; reduced: boolean; color?: string; r?: number; delay?: number }) {
  if (reduced) return null;
  return (
    <motion.circle
      cx={at.x}
      cy={at.y}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: [0.6, 2], opacity: [0.7, 0] }}
      transition={{ duration: 1.1, delay }}
      style={{ transformOrigin: `${at.x}px ${at.y}px` }}
    />
  );
}

/* ------------------------------------------------------------------ HTML : contrôles et panneaux */

export type Choice<T extends string> = { id: T; label: string };

/** Groupe de boutons à bascule accessibles (aria-pressed). */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  onPreview,
  className,
}: {
  label: string;
  options: readonly Choice<T>[];
  value: T | null;
  onChange: (id: T) => void;
  /** Aperçu au survol ou au focus (facultatif). */
  onPreview?: (id: T | null) => void;
  className?: string;
}) {
  const labelId = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p id={labelId} className="text-xs font-medium text-muted">
        {label}
      </p>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const pressed = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(o.id)}
              onMouseEnter={onPreview ? () => onPreview(o.id) : undefined}
              onMouseLeave={onPreview ? () => onPreview(null) : undefined}
              onFocus={onPreview ? () => onPreview(o.id) : undefined}
              onBlur={onPreview ? () => onPreview(null) : undefined}
              className={cn(
                "min-h-9 rounded-[var(--radius-control)] border px-3 py-1.5 text-left text-sm transition",
                pressed ? "border-signal bg-signal-wash text-ink" : "border-line text-ink-2 hover:border-line-strong",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Panneau d'explication lu par les lecteurs d'écran à chaque changement. */
export function InfoPanel({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div aria-live="polite" className={cn("mt-3 rounded-[var(--radius-control)] bg-mist px-3 py-2.5 text-sm text-ink-2", className)}>
      {title ? <p className="font-medium text-ink">{title}</p> : null}
      <div className={cn("space-y-1.5", title ? "mt-1" : undefined)}>{children}</div>
    </div>
  );
}

/** Liste de couples terme / valeur. */
export function Facts({ items }: { items: { term: string; value: ReactNode; mono?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1">
      {items.map((it) => (
        <div key={it.term} className="contents">
          <dt className="text-muted">{it.term}</dt>
          <dd className={cn("text-ink", it.mono && "font-mono text-[13px]")}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StepBar({ steps, state, extra }: { steps: DiagramStep[]; state: StepsState; extra?: ReactNode }) {
  const current = steps[state.step];
  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div aria-live="polite" className="min-h-[2.75rem] text-sm">
        <p className="font-medium text-ink">
          <span className="mr-2 tabular-nums text-muted">
            {state.step + 1}/{steps.length}
          </span>
          {current?.title}
        </p>
        <p className="text-muted">{current?.description}</p>
        {extra ? <div className="mt-2">{extra}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
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
  );
}

/**
 * Cadre identique à `DiagramFrame`, avec une zone de contrôles HTML (boutons, panneau)
 * placée hors de la zone graphique, et une navigation pas à pas facultative.
 */
export function DiagramShell({
  title,
  children,
  controls,
  steps,
  state,
  stepExtra,
  className,
}: {
  title: string;
  children: ReactNode;
  controls?: ReactNode;
  steps?: DiagramStep[];
  state?: StepsState;
  /** Contenu HTML propre à l'étape courante, lu avec elle (zone aria-live). */
  stepExtra?: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface", className)}>
      <div className="relative overflow-x-auto px-3 pt-4 sm:px-6" role="img" aria-label={title}>
        <div className="min-w-[440px]">{children}</div>
      </div>
      {controls ? <div className="border-t border-line px-4 py-3 sm:px-6">{controls}</div> : null}
      {steps && state ? <StepBar steps={steps} state={state} extra={stepExtra} /> : null}
    </figure>
  );
}

/** Pastille d'état : en attente, en cours, réussi, échec, ignoré. */
export function Mark({ x, y, kind, r = 7 }: { x: number; y: number; kind: "pending" | "current" | "ok" | "fail" | "skip"; r?: number }) {
  if (kind === "ok") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="var(--ok)" />
        <path d={`M${x - 3.2} ${y + 0.2} L${x - 0.8} ${y + 2.6} L${x + 3.4} ${y - 2.4}`} fill="none" stroke="var(--paper)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  if (kind === "fail") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="var(--danger)" />
        <path d={`M${x - 2.6} ${y - 2.6} L${x + 2.6} ${y + 2.6} M${x + 2.6} ${y - 2.6} L${x - 2.6} ${y + 2.6}`} stroke="var(--paper)" strokeWidth={1.6} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <circle
      cx={x}
      cy={y}
      r={r - 1}
      fill={kind === "current" ? "var(--signal-wash)" : "var(--surface)"}
      stroke={kind === "current" ? "var(--signal)" : kind === "skip" ? "var(--line)" : "var(--line-strong)"}
      strokeWidth={kind === "current" ? 2 : 1.25}
      strokeDasharray={kind === "skip" ? "2 2" : undefined}
    />
  );
}

/* ------------------------------------------------------------------ IPv4 */

export function ipToInt(o: readonly number[]) {
  return (((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;
}
export function intToOctets(n: number) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}
export function dotted(n: number) {
  return intToOctets(n).join(".");
}
export function prefixMask(p: number) {
  return p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
}
/** Nombre avec séparateur de milliers (espace insécable), identique côté serveur et navigateur. */
export function groupThousands(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
