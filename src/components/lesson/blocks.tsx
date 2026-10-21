import type { ReactNode } from "react";
import { AlertTriangle, BookMarked, Info, Lightbulb, MapPin, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import type { Block } from "@/content/schema";
import { RichText } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { CopyButton } from "./copy-button";
import { DiagramBlock } from "./diagram-block";

const SHELL_LABEL: Record<string, string> = { cmd: "Invite de commandes", powershell: "PowerShell", bash: "Bash", "cisco-ios": "Cisco IOS", text: "Sortie" };
const PROMPT: Record<string, string> = { cmd: "C:\\>", powershell: "PS>", bash: "$", "cisco-ios": "SW1#", text: "" };

const CALLOUT: Record<string, { icon: typeof Info; cls: string; label: string }> = {
  definition: { icon: BookMarked, cls: "border-signal/30 bg-signal-wash", label: "Définition" },
  analogy: { icon: Sparkles, cls: "border-line bg-mist", label: "Analogie" },
  info: { icon: Info, cls: "border-line bg-surface", label: "À savoir" },
  tip: { icon: Lightbulb, cls: "border-ok/30 bg-ok-wash", label: "Astuce" },
  warning: { icon: AlertTriangle, cls: "border-warn/40 bg-warn-wash", label: "Attention" },
  danger: { icon: ShieldAlert, cls: "border-danger/40 bg-danger-wash", label: "Danger" },
  field: { icon: MapPin, cls: "border-line-strong bg-surface", label: "Sur le terrain" },
};

function Section({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <div id={id} data-block={id} className={cn("scroll-mt-24", className)}>
      {children}
    </div>
  );
}

/** Rendu serveur des blocs statiques. Les blocs interactifs (quiz, exercice) sont rendus par le lecteur. */
export function StaticBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading":
      return (
        <Section id={block.id} className={block.level === 2 ? "pt-6" : "pt-2"}>
          {block.level === 2 ? <h2 className="text-[22px] font-semibold tracking-tight text-ink">{block.text}</h2> : <h3 className="text-lg font-semibold text-ink">{block.text}</h3>}
        </Section>
      );
    case "paragraph":
      return (
        <Section id={block.id}>
          <p className="prose-lesson">
            <RichText text={block.text} />
          </p>
        </Section>
      );
    case "callout": {
      const c = CALLOUT[block.tone];
      return (
        <Section id={block.id}>
          <aside className={cn("max-w-[70ch] rounded-[var(--radius-panel)] border px-5 py-4", c.cls)} aria-label={c.label}>
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <c.icon className="h-4 w-4" aria-hidden="true" />
              {block.title}
            </p>
            <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-2">
              <RichText text={block.text} />
            </p>
          </aside>
        </Section>
      );
    }
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Section id={block.id}>
          <Tag className={cn("prose-lesson space-y-2 pl-5", block.ordered ? "list-decimal marker:text-muted" : "list-disc marker:text-line-strong")}>
            {block.items.map((it, i) => (
              <li key={i} className="pl-1">
                <RichText text={it} />
              </li>
            ))}
          </Tag>
        </Section>
      );
    }
    case "command": {
      const lines = block.output?.split("\n") ?? [];
      return (
        <Section id={block.id}>
          <figure className="max-w-[78ch] overflow-hidden rounded-[var(--radius-panel)] border border-line">
            <div className="bg-term-bg">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                <span className="text-xs text-term-dim">{SHELL_LABEL[block.shell]}</span>
                <CopyButton text={block.command} />
              </div>
              <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-term-fg">
                {block.command.split("\n").map((l, i) => (
                  <div key={i}>
                    {PROMPT[block.shell] ? <span className="select-none text-term-prompt">{PROMPT[block.shell]} </span> : null}
                    {l}
                  </div>
                ))}
                {lines.length ? (
                  <div className="mt-2 border-t border-white/10 pt-2 text-term-fg/85">
                    {lines.map((l, i) => {
                      const noteIdx = block.outputNotes?.findIndex((n) => l.includes(n.match)) ?? -1;
                      return (
                        <div key={i} className={cn("whitespace-pre", noteIdx >= 0 && "bg-white/[0.06]")}>
                          {l || " "}
                          {noteIdx >= 0 ? <span className="select-none pl-3 text-term-prompt">[{noteIdx + 1}]</span> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </pre>
            </div>
            <figcaption className="space-y-3 bg-surface px-4 py-3.5 text-[15px] leading-relaxed text-ink-2">
              <p>
                <RichText text={block.explanation} />
              </p>
              {block.outputNotes?.length ? (
                <ol className="space-y-1.5 text-sm">
                  {block.outputNotes.map((n, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="w-6 shrink-0 font-mono text-signal-ink">[{i + 1}]</span>
                      <span>
                        <span className="font-medium text-ink">{n.match}</span> : <RichText text={n.note} />
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </figcaption>
          </figure>
        </Section>
      );
    }
    case "code":
      return (
        <Section id={block.id}>
          <figure className="max-w-[78ch] overflow-hidden rounded-[var(--radius-panel)] border border-line bg-term-bg">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <span className="text-xs text-term-dim">{block.language}</span>
              <CopyButton text={block.code} label="Copier le code" />
            </div>
            <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-term-fg">{block.code}</pre>
            {block.caption ? <figcaption className="bg-surface px-4 py-2.5 text-sm text-muted">{block.caption}</figcaption> : null}
          </figure>
        </Section>
      );
    case "table":
      return (
        <Section id={block.id}>
          <figure className="max-w-[86ch]">
            <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-mist/60">
                  <tr>
                    {block.headers.map((h) => (
                      <th key={h} scope="col" className="px-4 py-2.5 text-left font-medium text-ink">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((r, i) => (
                    <tr key={i} className="border-t border-line align-top">
                      {r.map((c, j) => (
                        <td key={j} className={cn("px-4 py-2.5 leading-relaxed", j === 0 ? "text-ink" : "text-ink-2")}>
                          <RichText text={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {block.caption ? <figcaption className="mt-2 text-sm text-muted">{block.caption}</figcaption> : null}
          </figure>
        </Section>
      );
    case "diagram":
      return (
        <Section id={block.id}>
          <figure className="max-w-[86ch]">
            <DiagramBlock diagram={block.diagram} />
            <figcaption className="mt-2 text-sm text-muted">{block.caption}</figcaption>
          </figure>
        </Section>
      );
    case "steps":
      return (
        <Section id={block.id}>
          <div className="max-w-[78ch] rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <p className="flex items-center gap-2 font-medium text-ink">
              <Wrench className="h-4 w-4 text-signal" aria-hidden="true" />
              {block.title}
            </p>
            <ol className="mt-4 space-y-4">
              {block.steps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-xs font-semibold tabular-nums text-ink">{i + 1}</span>
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-medium text-ink">{s.title}</p>
                    <p className="text-[15px] leading-relaxed text-ink-2">
                      <RichText text={s.text} />
                    </p>
                    {s.command ? (
                      <div className="flex items-center justify-between gap-3 rounded-md bg-term-bg px-3 py-1.5 font-mono text-[13px] text-term-fg">
                        <code className="overflow-x-auto whitespace-pre">{s.command}</code>
                        <CopyButton text={s.command} />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      );
    case "mistakes":
      return (
        <Section id={block.id}>
          <h3 className="mb-3 text-lg font-semibold text-ink">Erreurs fréquentes</h3>
          <ul className="max-w-[78ch] divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
            {block.items.map((m, i) => (
              <li key={i} className="grid gap-1.5 px-5 py-4 sm:grid-cols-[1fr_1fr] sm:gap-6">
                <div>
                  <p className="font-medium text-ink">
                    <RichText text={m.mistake} />
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    <RichText text={m.why} />
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-ink-2">
                  <span className="font-medium text-ok">À la place : </span>
                  <RichText text={m.fix} />
                </p>
              </li>
            ))}
          </ul>
        </Section>
      );
    case "risks":
      return (
        <Section id={block.id}>
          <aside className="max-w-[70ch] rounded-[var(--radius-panel)] border border-danger/30 bg-danger-wash px-5 py-4" aria-label="Risques et précautions">
            <p className="flex items-center gap-2 font-medium text-ink">
              <ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" /> Risques et précautions
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-2 marker:text-danger/60">
              {block.items.map((r, i) => (
                <li key={i}>
                  <RichText text={r} />
                </li>
              ))}
            </ul>
          </aside>
        </Section>
      );
    case "interview":
      return (
        <Section id={block.id}>
          <h3 className="mb-3 text-lg font-semibold text-ink">En entretien</h3>
          <div className="max-w-[78ch] space-y-3">
            {block.questions.map((q, i) => (
              <details key={i} className="group rounded-[var(--radius-panel)] border border-line bg-surface px-5 py-4">
                <summary className="cursor-pointer list-none font-medium text-ink [&::-webkit-details-marker]:hidden">
                  « {q.question} »<span className="ml-2 text-sm font-normal text-muted group-open:hidden">Préparez votre réponse, puis comparez.</span>
                </summary>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
                  <div>
                    <p className="text-sm font-medium text-ink">Ce que le recruteur attend</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-2">
                      {q.expectedPoints.map((p, j) => (
                        <li key={j}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[var(--radius-control)] bg-mist px-4 py-3">
                    <p className="text-sm font-medium text-ink">Réponse modèle</p>
                    <p className="mt-1 text-ink-2">{q.modelAnswer}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </Section>
      );
    case "glossary":
      return (
        <Section id={block.id}>
          <h3 className="mb-3 text-lg font-semibold text-ink">Glossaire</h3>
          <dl className="max-w-[78ch] divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
            {block.terms.map((t) => (
              <div key={t.term} className="grid gap-1 px-5 py-3 sm:grid-cols-[200px_1fr] sm:gap-6">
                <dt>
                  <span className="font-medium text-ink">{t.term}</span>
                  <span className="block text-sm italic text-muted" lang="en">
                    {t.en}
                  </span>
                </dt>
                <dd className="text-[15px] leading-relaxed text-ink-2">{t.definition}</dd>
              </div>
            ))}
          </dl>
        </Section>
      );
    case "summary":
      return (
        <Section id={block.id}>
          <div className="max-w-[70ch] rounded-[var(--radius-panel)] border border-ink/80 px-5 py-4">
            <p className="font-medium text-ink">L&apos;essentiel à retenir</p>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink-2">
              {block.points.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ok" aria-hidden="true" />
                  <span>
                    <RichText text={p} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      );
    case "references":
      return (
        <Section id={block.id}>
          <h3 className="mb-2 text-sm font-medium text-ink">Références</h3>
          <ul className="max-w-[78ch] space-y-1.5 text-sm text-muted">
            {block.items.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline underline-offset-4 hover:text-ink">
                  {r.title}
                </a>{" "}
                ({r.publisher}), vérifié le {new Date(`${r.verifiedAt}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </li>
            ))}
          </ul>
          <p className="mt-2 max-w-[78ch] text-xs text-muted">Contenu rédigé par Harmonie IT Academy. Les marques citées appartiennent à leurs propriétaires ; aucun partenariat n&apos;est sous-entendu.</p>
        </Section>
      );
    default:
      return null;
  }
}
