"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import type { PublicQuestion } from "@/server/engines/grading";
import type { AttemptView } from "@/server/services/assessments";
import { submitQuizAction } from "@/server/actions/learning";
import { QuestionInput, initialValue, isAnswered } from "@/components/assessment/question-input";
import { QuestionResult } from "@/components/assessment/question-result";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

export type PublicQuiz = { slug: string; title: string; questions: { id: string; prompt: string; question: PublicQuestion }[] };

export function QuizBlock({ quiz, title, bestPercent, onPassed }: { quiz: PublicQuiz; title: string; bestPercent: number | null; onPassed?: () => void }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(quiz.questions.map((q) => [q.id, initialValue(q.question)])));
  const [result, setResult] = useState<AttemptView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reduced = useReducedMotion();
  const answered = quiz.questions.filter((q) => isAnswered(q.question, values[q.id])).length;

  async function submit() {
    setPending(true);
    setError(null);
    const r = await submitQuizAction(quiz.slug, values);
    setPending(false);
    if (!r.ok) return setError(r.error);
    setResult(r.data);
    if (r.data.passed) onPassed?.();
  }

  return (
    <section id="quiz" data-block="quiz" className="max-w-[78ch] scroll-mt-24 rounded-[var(--radius-panel)] border border-line bg-surface" aria-labelledby="quiz-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <h3 id="quiz-title" className="font-semibold text-ink">
          {title}
        </h3>
        <p className="text-sm text-muted">{bestPercent !== null ? `Meilleur score : ${bestPercent} %` : `${quiz.questions.length} questions, réussite à 60 %`}</p>
      </div>
      <ol className="divide-y divide-line">
        {quiz.questions.map((q, i) => {
          const res = result?.questions.find((x) => x.id === q.id)?.result;
          return (
            <li key={q.id} className="px-5 py-5">
              <p className="mb-3 font-medium text-ink">
                <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
                {q.prompt}
              </p>
              <QuestionInput id={`${quiz.slug}-${q.id}`} question={q.question} value={values[q.id]} onChange={(v) => setValues((s) => ({ ...s, [q.id]: v }))} disabled={Boolean(result)} />
              {res ? (
                <motion.div initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : i * 0.06 }}>
                  <QuestionResult question={q.question} result={res} />
                </motion.div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
        {error ? <FormMessage>{error}</FormMessage> : null}
        {result ? (
          <>
            <motion.p initial={reduced ? false : { scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[15px] font-medium text-ink" role="status">
              {result.passed ? `Quiz réussi : ${result.percent} %` : `${result.percent} % : relisez les explications puis réessayez`}
            </motion.p>
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setValues(Object.fromEntries(quiz.questions.map((q) => [q.id, initialValue(q.question)])));
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Recommencer
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              {answered}/{quiz.questions.length} réponses
            </p>
            <Button onClick={submit} disabled={pending || answered < quiz.questions.length}>
              {pending ? "Correction…" : "Valider mes réponses"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
