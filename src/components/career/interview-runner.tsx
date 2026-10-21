"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { answerInterviewAction, finishInterviewAction } from "@/server/actions/career";
import type { RubricResult } from "@/server/engines/rubric";
import { RubricFeedback } from "@/components/assessment/question-result";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

type Q = {
  id: string;
  index: number;
  kind: string;
  prompt: string;
  estimatedMinutes: number;
  answer: null | { text: string; score: number; feedback: RubricResult; modelAnswer: string; explanation: string; lessonSlugs: string[] };
};

const KIND = { rh: "RH", technique: "Technique", situation: "Mise en situation" } as Record<string, string>;

export function InterviewRunner({ sessionId, status, initial, lang }: { sessionId: string; status: string; initial: Q[]; lang: "fr" | "en" }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [questions, setQuestions] = useState(initial);
  const [index, setIndex] = useState(() => Math.max(0, initial.findIndex((q) => !q.answer)));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const q = questions[index];
  const allAnswered = questions.every((x) => x.answer);
  const finished = status === "completed";

  async function send() {
    setPending(true);
    setError(null);
    const r = await answerInterviewAction({ sessionId, questionId: q.id, answer: draft });
    setPending(false);
    if (!r.ok) return setError(r.error);
    setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, answer: { text: draft, ...r.data } } : x)));
    setDraft("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
      <div className="space-y-4">
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-6">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              Question {index + 1} sur {questions.length}
            </span>
            <Badge>{KIND[q.kind] ?? q.kind}</Badge>
          </div>
          <p className="mt-3 text-lg font-medium leading-relaxed text-ink" lang={lang}>
            « {q.prompt} »
          </p>
          {!q.answer ? (
            <div className="mt-5 space-y-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-44"
                lang={lang}
                aria-label="Votre réponse"
                placeholder={lang === "en" ? "Write your answer as you would say it." : "Écrivez votre réponse comme vous la diriez à l'oral."}
                disabled={finished}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  {draft.trim() ? draft.trim().split(/\s+/).length : 0} mots. À l&apos;oral, comptez environ {q.estimatedMinutes} min.
                </span>
                <Button onClick={send} disabled={pending || finished || draft.trim().split(/\s+/).length < 10}>
                  {pending ? "Analyse…" : "Valider ma réponse"}
                </Button>
              </div>
            </div>
          ) : (
            <motion.div initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-4">
              <div className="rounded-[var(--radius-control)] bg-mist px-4 py-3">
                <p className="text-sm font-medium text-ink">Votre réponse</p>
                <p className="mt-1 whitespace-pre-wrap text-[15px] text-ink-2">{q.answer.text}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-3xl font-semibold tabular-nums", q.answer.score >= 70 ? "text-ok" : q.answer.score >= 50 ? "text-warn" : "text-danger")}>{q.answer.score}</span>
                <span className="text-sm text-muted">sur 100 selon la grille</span>
              </div>
              <RubricFeedback rubric={q.answer.feedback} />
              {q.answer.feedback.structure ? (
                <p className="text-sm text-ink-2">
                  Structure : situation {q.answer.feedback.structure.situation ? "présente" : "absente"}, action {q.answer.feedback.structure.action ? "présente" : "absente"}, résultat{" "}
                  {q.answer.feedback.structure.result ? "présent" : "absent"}.
                </p>
              ) : null}
              <div className="rounded-[var(--radius-control)] border border-ok/30 bg-ok-wash px-4 py-3">
                <p className="text-sm font-medium text-ink">Réponse modèle</p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-2" lang={lang}>
                  {q.answer.modelAnswer}
                </p>
              </div>
              <p className="text-[15px] leading-relaxed text-ink-2">
                <span className="font-medium text-ink">Ce que le recruteur évalue : </span>
                {q.answer.explanation}
              </p>
              {q.answer.lessonSlugs.length ? (
                <p className="flex flex-wrap gap-x-4 text-sm">
                  <span className="text-muted">Pour progresser :</span>
                  {q.answer.lessonSlugs.map((l) => (
                    <Link key={l} href={`/campus/cours/${l}`} className="text-signal-ink hover:underline">
                      {l.replace(/^n1-/, "").replace(/-/g, " ")}
                    </Link>
                  ))}
                </p>
              ) : null}
            </motion.div>
          )}
        </div>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <div className="flex justify-between">
          <Button variant="secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            Précédente
          </Button>
          {index < questions.length - 1 ? (
            <Button onClick={() => setIndex((i) => i + 1)} disabled={!q.answer}>
              Question suivante
            </Button>
          ) : !finished ? (
            <Button
              disabled={pending || !questions.some((x) => x.answer)}
              onClick={async () => {
                setPending(true);
                const r = await finishInterviewAction(sessionId);
                setPending(false);
                if (!r.ok) return setError(r.error);
                router.refresh();
              }}
            >
              {allAnswered ? "Terminer la simulation" : "Terminer maintenant"}
            </Button>
          ) : null}
        </div>
      </div>
      <aside className="space-y-3">
        <ol className="space-y-1.5" aria-label="Questions">
          {questions.map((x, i) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? "step" : undefined}
                className={cn("flex w-full items-center justify-between rounded-[var(--radius-control)] px-3 py-2 text-left text-sm", i === index ? "bg-mist text-ink" : "text-ink-2 hover:bg-mist/60")}
              >
                <span>Question {i + 1}</span>
                {x.answer ? <span className="tabular-nums text-muted">{x.answer.score}</span> : null}
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
