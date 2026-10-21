"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { lessonDocSchema, type Block, type LessonDoc } from "@/content/schema";
import { saveDraftAction } from "@/server/actions/studio";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

const KIND_LABEL: Record<Block["kind"], string> = {
  heading: "Titre",
  paragraph: "Paragraphe",
  callout: "Encadré",
  list: "Liste",
  command: "Commande",
  code: "Code",
  table: "Tableau",
  diagram: "Schéma",
  steps: "Démonstration",
  mistakes: "Erreurs fréquentes",
  risks: "Risques",
  quiz: "Quiz",
  exercise: "Exercice",
  interview: "Questions d'entretien",
  glossary: "Glossaire",
  summary: "Résumé",
  references: "Références",
};

const TEMPLATES: Record<Block["kind"], (id: string) => Block> = {
  heading: (id) => ({ id, kind: "heading", level: 2, text: "Nouveau titre" }),
  paragraph: (id) => ({ id, kind: "paragraph", text: "Texte du paragraphe." }),
  callout: (id) => ({ id, kind: "callout", tone: "info", title: "À savoir", text: "Contenu de l'encadré." }),
  list: (id) => ({ id, kind: "list", ordered: false, items: ["Premier point"] }),
  command: (id) => ({ id, kind: "command", shell: "cmd", command: "ipconfig /all", explanation: "Ce que fait la commande et chacune de ses options." }),
  code: (id) => ({ id, kind: "code", language: "powershell", code: "Get-Service" }),
  table: (id) => ({ id, kind: "table", headers: ["Colonne 1", "Colonne 2"], rows: [["", ""]] }),
  diagram: (id) => ({ id, kind: "diagram", diagram: "dhcp-dora", caption: "Légende du schéma." }),
  steps: (id) => ({ id, kind: "steps", title: "Démonstration", steps: [{ title: "Étape 1", text: "…" }, { title: "Étape 2", text: "…" }] }),
  mistakes: (id) => ({ id, kind: "mistakes", items: [{ mistake: "…", why: "…", fix: "…" }, { mistake: "…", why: "…", fix: "…" }] }),
  risks: (id) => ({ id, kind: "risks", items: ["…"] }),
  quiz: (id) => ({ id, kind: "quiz", title: "Vérifiez votre compréhension", questions: ["code-question-1", "code-question-2", "code-question-3"] }),
  exercise: (id) => ({ id, kind: "exercise", title: "Exercice", context: "Contexte…", task: "Consigne…", hints: ["Indice 1", "Indice 2", "Indice 3"], solution: ["Correction…", "Suite…"] }),
  interview: (id) => ({ id, kind: "interview", questions: [{ question: "…", expectedPoints: ["…", "…"], modelAnswer: "…" }, { question: "…", expectedPoints: ["…", "…"], modelAnswer: "…" }] }),
  glossary: (id) => ({ id, kind: "glossary", terms: [{ term: "…", en: "…", definition: "…" }] }),
  summary: (id) => ({ id, kind: "summary", points: ["…", "…", "…"] }),
  references: (id) => ({ id, kind: "references", items: [{ title: "…", url: "https://learn.microsoft.com/", publisher: "…", verifiedAt: new Date().toISOString().slice(0, 10) }] }),
};

function summaryOf(b: Block): string {
  switch (b.kind) {
    case "heading":
    case "paragraph":
      return b.text;
    case "callout":
      return `${b.title} : ${b.text}`;
    case "command":
      return b.command;
    case "diagram":
      return b.diagram;
    case "steps":
    case "exercise":
      return b.title;
    case "quiz":
      return b.questions.join(", ");
    default:
      return "";
  }
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** Édition d'un bloc : formulaire pour les blocs de texte, JSON validé pour les blocs complexes. */
function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const [raw, setRaw] = useState(() => JSON.stringify(block, null, 2));
  const [rawError, setRawError] = useState<string | null>(null);
  if (block.kind === "heading") {
    return (
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Select value={block.level} onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })} aria-label="Niveau de titre">
          <option value={2}>Titre</option>
          <option value={3}>Sous-titre</option>
        </Select>
        <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} aria-label="Texte du titre" />
      </div>
    );
  }
  if (block.kind === "paragraph") {
    return <Textarea value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} aria-label="Texte" className="min-h-28" />;
  }
  if (block.kind === "callout") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <Select value={block.tone} onChange={(e) => onChange({ ...block, tone: e.target.value as typeof block.tone })} aria-label="Type d'encadré">
            {["definition", "analogy", "info", "tip", "warning", "danger", "field"].map((t) => (
              <option key={t} value={t}>
                {{ definition: "Définition", analogy: "Analogie", info: "À savoir", tip: "Astuce", warning: "Attention", danger: "Danger", field: "Sur le terrain" }[t]}
              </option>
            ))}
          </Select>
          <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} aria-label="Titre de l'encadré" />
        </div>
        <Textarea value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} aria-label="Texte de l'encadré" />
      </div>
    );
  }
  if (block.kind === "list" || block.kind === "summary" || block.kind === "risks") {
    const items = block.kind === "summary" ? block.points : block.items;
    return (
      <div className="space-y-2">
        {block.kind === "list" ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={block.ordered} onChange={(e) => onChange({ ...block, ordered: e.target.checked })} /> Liste numérotée
          </label>
        ) : null}
        <Textarea
          defaultValue={items.join("\n")}
          onChange={(e) => {
            const v = lines(e.target.value);
            onChange(block.kind === "summary" ? { ...block, points: v } : { ...block, items: v });
          }}
          aria-label="Un élément par ligne"
          className="min-h-28"
        />
        <p className="text-xs text-muted">Un élément par ligne. Mise en forme : **gras**, *italique*, `code`.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value) as Block;
            setRawError(null);
            onChange({ ...parsed, id: block.id, kind: block.kind } as Block);
          } catch {
            setRawError("JSON invalide : vérifiez les virgules et les guillemets.");
          }
        }}
        className="min-h-56 font-mono text-[13px]"
        aria-label="Contenu du bloc (JSON)"
        spellCheck={false}
      />
      {rawError ? <p className="text-sm text-danger">{rawError}</p> : <p className="text-xs text-muted">Bloc structuré : modifiez les valeurs, la structure est validée à l&apos;enregistrement.</p>}
    </div>
  );
}

export function LessonEditor({ versionId, initial, editable }: { versionId: string; initial: LessonDoc; editable: boolean }) {
  const router = useRouter();
  const [doc, setDoc] = useState<LessonDoc>(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [addKind, setAddKind] = useState<Block["kind"]>("paragraph");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [serverIssues, setServerIssues] = useState<{ path: string; message: string }[]>([]);
  const [pending, setPending] = useState(false);
  const validation = useMemo(() => lessonDocSchema.safeParse(doc), [doc]);
  const issues = validation.success ? [] : validation.error.issues.slice(0, 12);

  const update = (i: number, b: Block) => setDoc((d) => ({ ...d, blocks: d.blocks.map((x, j) => (j === i ? b : x)) }));
  const move = (i: number, dir: -1 | 1) =>
    setDoc((d) => {
      const blocks = [...d.blocks];
      const j = i + dir;
      if (j < 0 || j >= blocks.length) return d;
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...d, blocks };
    });
  const remove = (i: number) => setDoc((d) => ({ ...d, blocks: d.blocks.filter((_, j) => j !== i) }));
  const add = () => {
    let n = 1;
    while (doc.blocks.some((b) => b.id === `${addKind}-${n}`)) n++;
    const b = TEMPLATES[addKind](`${addKind}-${n}`);
    setDoc((d) => ({ ...d, blocks: [...d.blocks, b] }));
    setOpen(b.id);
  };

  async function save() {
    setPending(true);
    setMsg(null);
    setServerIssues([]);
    const r = await saveDraftAction(versionId, doc, note);
    setPending(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    if (!r.data.ok) {
      setServerIssues(r.data.issues);
      return setMsg({ ok: false, text: "La version n'a pas été enregistrée : corrigez les points signalés." });
    }
    setMsg({ ok: true, text: "Brouillon enregistré." });
    router.refresh();
  }

  const m = doc.meta;
  return (
    <div className="space-y-6">
      <fieldset disabled={!editable} className="space-y-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5">
        <legend className="px-1 text-sm font-medium">Fiche de la leçon</legend>
        <Field label="Titre" htmlFor="m-title">
          <Input id="m-title" value={m.title} onChange={(e) => setDoc({ ...doc, meta: { ...m, title: e.target.value } })} />
        </Field>
        <Field label="Résumé (40 à 240 caractères)" htmlFor="m-summary">
          <Textarea id="m-summary" value={m.summary} onChange={(e) => setDoc({ ...doc, meta: { ...m, summary: e.target.value } })} className="min-h-20" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Niveau" htmlFor="m-level">
            <Select id="m-level" value={m.level} onChange={(e) => setDoc({ ...doc, meta: { ...m, level: e.target.value as typeof m.level } })}>
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="avance">Avancé</option>
            </Select>
          </Field>
          <Field label="Durée (minutes)" htmlFor="m-dur">
            <Input id="m-dur" type="number" min={5} max={120} value={m.durationMin} onChange={(e) => setDoc({ ...doc, meta: { ...m, durationMin: Number(e.target.value) } })} />
          </Field>
          <Field label="Leçon suivante (slug)" htmlFor="m-next">
            <Input id="m-next" value={m.next ?? ""} onChange={(e) => setDoc({ ...doc, meta: { ...m, next: e.target.value || undefined } })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Objectifs (un par ligne)" htmlFor="m-obj">
            <Textarea id="m-obj" defaultValue={m.objectives.join("\n")} onChange={(e) => setDoc({ ...doc, meta: { ...m, objectives: lines(e.target.value) } })} />
          </Field>
          <Field label="Prérequis (un par ligne)" htmlFor="m-pre">
            <Textarea id="m-pre" defaultValue={m.prerequisites.join("\n")} onChange={(e) => setDoc({ ...doc, meta: { ...m, prerequisites: lines(e.target.value) } })} />
          </Field>
        </div>
      </fieldset>

      <section aria-label="Blocs de la leçon" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">
            Blocs <span className="text-sm font-normal text-muted">({doc.blocks.length})</span>
          </h2>
        </div>
        <ol className="space-y-2">
          {doc.blocks.map((b, i) => (
            <li key={b.id} className="rounded-[var(--radius-control)] border border-line bg-surface">
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => setOpen(open === b.id ? null : b.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open === b.id}>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open === b.id && "rotate-180")} aria-hidden="true" />
                  <Badge className="shrink-0">{KIND_LABEL[b.kind]}</Badge>
                  <span className="truncate text-sm text-ink-2">{summaryOf(b)}</span>
                </button>
                {editable ? (
                  <span className="flex shrink-0 gap-0.5">
                    <button type="button" onClick={() => move(i, -1)} className="rounded p-1.5 text-muted hover:bg-mist" aria-label="Monter le bloc">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} className="rounded p-1.5 text-muted hover:bg-mist" aria-label="Descendre le bloc">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(i)} className="rounded p-1.5 text-muted hover:bg-danger-wash hover:text-danger" aria-label="Supprimer le bloc">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                ) : null}
              </div>
              {open === b.id ? (
                <fieldset disabled={!editable} className="border-t border-line px-3 py-3">
                  <BlockEditor block={b} onChange={(nb) => update(i, nb)} />
                </fieldset>
              ) : null}
            </li>
          ))}
        </ol>
        {editable ? (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Select value={addKind} onChange={(e) => setAddKind(e.target.value as Block["kind"])} className="w-56" aria-label="Type de bloc à ajouter">
              {Object.entries(KIND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={add}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter
            </Button>
          </div>
        ) : null}
      </section>

      {editable ? (
        <div className="sticky bottom-0 space-y-3 border-t border-line bg-paper/95 py-4 backdrop-blur">
          {issues.length || serverIssues.length ? (
            <div className="rounded-[var(--radius-control)] border border-warn/40 bg-warn-wash px-4 py-3 text-sm">
              <p className="font-medium text-ink">Points à corriger avant d&apos;enregistrer</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
                {(serverIssues.length ? serverIssues : issues.map((x) => ({ path: x.path.join("."), message: x.message }))).map((x, i) => (
                  <li key={i}>
                    {x.path ? <code className="inline-code">{x.path}</code> : null} {x.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-ok">Structure conforme à la charte pédagogique.</p>
          )}
          {msg ? <FormMessage tone={msg.ok ? "ok" : "danger"}>{msg.text}</FormMessage> : null}
          <div className="flex flex-wrap items-center gap-3">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note de version : ce qui a changé et pourquoi" className="max-w-md" aria-label="Note de version" />
            <Button onClick={save} disabled={pending || !validation.success}>
              {pending ? "Enregistrement…" : "Enregistrer le brouillon"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
