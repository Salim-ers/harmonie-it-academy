"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Lightbulb, PenLine } from "lucide-react";
import { getExerciseStateAction, revealExerciseAction, submitExerciseAction } from "@/server/actions/learning";
import type { RubricResult } from "@/server/engines/rubric";
import { RubricFeedback } from "@/components/assessment/question-result";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/field";
import { RichText } from "@/components/ui/misc";

const HINT_LABELS = ["Indice 1 : une orientation", "Indice 2 : une vérification", "Indice 3 : l'élément décisif"];

/**
 * Exercice intégré : les indices et la correction ne sont envoyés par le serveur qu'à la demande,
 * et chaque consultation est enregistrée (elle influe honnêtement sur le score).
 */
export function ExerciseBlock({ lessonSlug, blockId, title, context, task, gradable }: { lessonSlug: string; blockId: string; title: string; context: string; task: string; gradable: boolean }) {
  const [hints, setHints] = useState<string[]>([]);
  const [solution, setSolution] = useState<string[] | null>(null);
  const [answer, setAnswer] = useState("");
  const [graded, setGraded] = useState<{ result: RubricResult; score: number; hintsUsed: number; solutionSeen: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getExerciseStateAction({ slug: lessonSlug, blockId }).then((r) => {
      if (r.ok) {
        setHints(r.data.hints);
        setSolution(r.data.solution);
      }
    });
  }, [lessonSlug, blockId]);

  async function reveal(level: 1 | 2 | 3 | 4) {
    setError(null);
    const r = await revealExerciseAction({ slug: lessonSlug, blockId, level });
    if (!r.ok) return setError(r.error);
    setHints(r.data.hints);
    setSolution(r.data.solution);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const r = await submitExerciseAction({ slug: lessonSlug, blockId, answer });
    setPending(false);
    if (!r.ok) return setError(r.error);
    setGraded(r.data);
  }

  return (
    <section id={blockId} data-block={blockId} className="max-w-[78ch] scroll-mt-24 rounded-[var(--radius-panel)] border border-line bg-surface" aria-labelledby={`${blockId}-title`}>
      <div className="border-b border-line px-5 py-4">
        <p className="flex items-center gap-2 text-sm text-muted">
          <PenLine className="h-4 w-4 text-signal" aria-hidden="true" /> Exercice pratique
        </p>
        <h3 id={`${blockId}-title`} className="mt-1 font-semibold text-ink">
          {title}
        </h3>
      </div>
      <div className="space-y-4 px-5 py-5 text-[15.5px] leading-relaxed">
        <p className="text-ink-2">
          <RichText text={context} />
        </p>
        <p className="font-medium text-ink">
          <RichText text={task} />
        </p>
        {gradable ? (
          <div className="space-y-2">
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Votre analyse" placeholder="Rédigez votre analyse ici." className="min-h-36" disabled={Boolean(graded)} />
            {!graded ? (
              <div className="flex justify-end">
                <Button onClick={submit} disabled={pending || answer.trim().split(/\s+/).length < 15}>
                  {pending ? "Correction…" : "Faire corriger ma réponse"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {graded ? (
          <div className="rounded-[var(--radius-control)] border border-line bg-paper px-4 py-3">
            <p className="font-medium text-ink">
              Score : {graded.score} / 100
              {graded.hintsUsed ? <span className="ml-2 text-sm font-normal text-muted">({graded.hintsUsed} indice(s) consulté(s), −10 chacun)</span> : null}
              {graded.solutionSeen ? <span className="ml-2 text-sm font-normal text-muted">(correction vue avant la réponse : plafonné à 50)</span> : null}
            </p>
            <RubricFeedback rubric={graded.result} />
          </div>
        ) : null}
        {error ? <FormMessage>{error}</FormMessage> : null}

        <div className="space-y-2 border-t border-line pt-4">
          {hints.map((h, i) => (
            <div key={i} className="rounded-[var(--radius-control)] bg-warn-wash px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Lightbulb className="h-3.5 w-3.5 text-warn" aria-hidden="true" />
                {HINT_LABELS[i]}
              </p>
              <p className="mt-0.5 text-[15px] text-ink-2">
                <RichText text={h} />
              </p>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {hints.length < 3 ? (
              <Button variant="secondary" size="sm" onClick={() => reveal((hints.length + 1) as 1 | 2 | 3)}>
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" /> Afficher l&apos;indice {hints.length + 1}
              </Button>
            ) : null}
            {!solution ? (
              <Button variant="ghost" size="sm" onClick={() => reveal(4)}>
                <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" /> Voir la correction commentée
              </Button>
            ) : null}
          </div>
        </div>
        {solution ? (
          <div className="rounded-[var(--radius-control)] border border-ok/30 bg-ok-wash px-4 py-3">
            <p className="font-medium text-ink">Correction commentée</p>
            <div className="mt-1.5 space-y-2 text-ink-2">
              {solution.map((p, i) => (
                <p key={i}>
                  <RichText text={p} />
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
