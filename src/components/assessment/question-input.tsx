"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { PublicQuestion } from "@/server/engines/grading";
import { cn } from "@/lib/cn";
import { Textarea } from "@/components/ui/field";

export type ResponseValue = unknown;

/** Saisie d'une réponse selon le type de question. Entièrement utilisable au clavier. */
export function QuestionInput({
  id,
  question,
  value,
  onChange,
  disabled,
}: {
  id: string;
  question: PublicQuestion;
  value: ResponseValue;
  onChange: (v: ResponseValue) => void;
  disabled?: boolean;
}) {
  switch (question.type) {
    case "single":
      return (
        <div role="radiogroup" className="grid gap-2">
          {question.choices.map((c) => {
            const checked = value === c.id;
            return (
              <label
                key={c.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border px-3.5 py-2.5 text-[15px] transition",
                  checked ? "border-signal bg-signal-wash" : "border-line hover:border-line-strong",
                  disabled && "cursor-default",
                )}
              >
                <input type="radio" name={id} className="mt-1 accent-[var(--signal)]" checked={checked} disabled={disabled} onChange={() => onChange(c.id)} />
                <span className="text-ink">{c.text}</span>
              </label>
            );
          })}
        </div>
      );
    case "multiple": {
      const set = new Set(Array.isArray(value) ? (value as string[]) : []);
      return (
        <div className="grid gap-2">
          <p className="text-sm text-muted">Plusieurs réponses possibles.</p>
          {question.choices.map((c) => {
            const checked = set.has(c.id);
            return (
              <label
                key={c.id}
                className={cn("flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border px-3.5 py-2.5 text-[15px] transition", checked ? "border-signal bg-signal-wash" : "border-line hover:border-line-strong")}
              >
                <input
                  type="checkbox"
                  className="mt-1 accent-[var(--signal)]"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    const n = new Set(set);
                    if (checked) n.delete(c.id);
                    else n.add(c.id);
                    onChange([...n]);
                  }}
                />
                <span className="text-ink">{c.text}</span>
              </label>
            );
          })}
        </div>
      );
    }
    case "truefalse": {
      const v = (value as { value?: boolean; justification?: string } | null) ?? {};
      return (
        <div className="space-y-3">
          <div role="radiogroup" className="flex gap-2">
            {[
              { b: true, l: "Vrai" },
              { b: false, l: "Faux" },
            ].map((o) => (
              <label key={o.l} className={cn("flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-4 py-2 text-[15px]", v.value === o.b ? "border-signal bg-signal-wash" : "border-line hover:border-line-strong")}>
                <input type="radio" name={id} className="accent-[var(--signal)]" checked={v.value === o.b} disabled={disabled} onChange={() => onChange({ ...v, value: o.b })} />
                {o.l}
              </label>
            ))}
          </div>
          {question.withJustification ? (
            <Textarea aria-label="Justification" placeholder="Justifiez en une ou deux phrases." value={v.justification ?? ""} disabled={disabled} onChange={(e) => onChange({ ...v, justification: e.target.value })} />
          ) : null}
        </div>
      );
    }
    case "order": {
      const order = Array.isArray(value) && (value as string[]).length === question.items.length ? (value as string[]) : question.items.map((i) => i.id);
      const byId = new Map(question.items.map((i) => [i.id, i]));
      const move = (i: number, d: -1 | 1) => {
        const n = [...order];
        const j = i + d;
        if (j < 0 || j >= n.length) return;
        [n[i], n[j]] = [n[j], n[i]];
        onChange(n);
      };
      return (
        <ol className="space-y-2" aria-label="Éléments à ordonner">
          {order.map((oid, i) => (
            <li key={oid} className="flex items-center gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-[15px]">
              <span className="w-5 text-right text-sm tabular-nums text-muted">{i + 1}</span>
              <span className="flex-1 text-ink">{byId.get(oid)?.text}</span>
              <span className="flex gap-1">
                <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} className="rounded p-1.5 text-muted hover:bg-mist hover:text-ink disabled:opacity-30" aria-label={`Monter « ${byId.get(oid)?.text} »`}>
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)} className="rounded p-1.5 text-muted hover:bg-mist hover:text-ink disabled:opacity-30" aria-label={`Descendre « ${byId.get(oid)?.text} »`}>
                  <ArrowDown className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      );
    }
    case "fill": {
      const [before, after] = question.template.split("___");
      return (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] bg-term-bg px-3 py-2.5 font-mono text-[14px] text-term-fg">
          <span className="whitespace-pre">{before}</span>
          <input
            aria-label="Réponse à compléter"
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="min-w-[8ch] flex-1 rounded border border-white/20 bg-white/5 px-2 py-1 text-term-fg outline-none focus:border-term-prompt"
            autoComplete="off"
            spellCheck={false}
          />
          {after ? <span className="whitespace-pre">{after}</span> : null}
        </div>
      );
    }
    case "match": {
      const v = (value as Record<string, string> | null) ?? {};
      return (
        <div className="space-y-2">
          {question.left.map((l) => (
            <div key={l.id} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr]">
              <span className="text-[15px] text-ink">{l.text}</span>
              <select
                aria-label={`Associer « ${l.text} »`}
                value={v[l.id] ?? ""}
                disabled={disabled}
                onChange={(e) => onChange({ ...v, [l.id]: e.target.value })}
                className="h-10 rounded-[var(--radius-control)] border border-line-strong bg-surface px-2 text-sm text-ink"
              >
                <option value="">Choisir…</option>
                {question.right.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.text}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }
    case "text_rubric":
      return (
        <div className="space-y-1.5">
          <Textarea aria-label="Votre réponse" value={typeof value === "string" ? value : ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="min-h-40" placeholder="Rédigez votre réponse comme vous le feriez en situation réelle." />
          <p className="text-xs text-muted">
            {question.minWords} mots minimum. La correction repère les notions attendues ; elle ne juge pas votre style.
          </p>
        </div>
      );
  }
}

export function isAnswered(q: PublicQuestion, v: ResponseValue) {
  if (v === undefined || v === null) return false;
  switch (q.type) {
    case "single":
      return typeof v === "string" && v.length > 0;
    case "multiple":
      return Array.isArray(v) && v.length > 0;
    case "truefalse":
      return typeof (v as { value?: boolean }).value === "boolean";
    case "order":
      return true;
    case "fill":
    case "text_rubric":
      return typeof v === "string" && v.trim().length > 0;
    case "match":
      return Object.keys(v as object).length === q.left.length && Object.values(v as Record<string, string>).every(Boolean);
  }
}

/** Valeur initiale : pour un ordre, la proposition affichée compte comme réponse. */
export function initialValue(q: PublicQuestion): ResponseValue {
  return q.type === "order" ? q.items.map((i) => i.id) : undefined;
}
