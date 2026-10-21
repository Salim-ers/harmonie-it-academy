"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Clock } from "lucide-react";
import type { AttemptView } from "@/server/services/assessments";
import { saveAnswerAction, submitAttemptAction } from "@/server/actions/learning";
import { QuestionInput, initialValue, isAnswered } from "./question-input";
import { QuestionResult } from "./question-result";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { formatCode } from "@/lib/codes-client";
import { SKILLS } from "@/content/skills";

function useCountdown(deadline: string | null, onExpire: () => void) {
  const compute = () => (deadline ? Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 1000)) : null);
  const [left, setLeft] = useState<number | null>(compute);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    if (!deadline) return;
    let fired = false;
    const t = setInterval(() => {
      const v = Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 1000));
      setLeft(v);
      // Temps écoulé : soumission automatique (le serveur refuse de toute façon les réponses tardives).
      if (v === 0 && !fired) {
        fired = true;
        expire.current();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return left;
}

/** Passage d'une évaluation : enregistrement automatique de chaque réponse, minuteur serveur, soumission. */
export function AttemptRunner({ initial }: { initial: AttemptView }) {
  const [view, setView] = useState(initial);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(initial.questions.map((q) => [q.id, q.savedResponse ?? initialValue(q.question)])),
  );
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const left = useCountdown(view.status === "in_progress" ? view.deadlineAt : null, () => void submit());
  const reduced = useReducedMotion();
  const done = view.status !== "in_progress";
  const answered = view.questions.filter((q) => isAnswered(q.question, values[q.id])).length;

  function change(qid: string, v: unknown) {
    setValues((s) => ({ ...s, [qid]: v }));
    clearTimeout(timers.current[qid]);
    timers.current[qid] = setTimeout(async () => {
      setSaving(qid);
      const r = await saveAnswerAction({ attemptId: view.attemptId, questionId: qid, response: v });
      setSaving(null);
      if (!r.ok) setError(r.error);
    }, 500);
  }

  async function submit() {
    setPending(true);
    setError(null);
    // Enregistre d'abord les réponses encore en attente.
    for (const [qid, t] of Object.entries(timers.current)) {
      clearTimeout(t);
      if (values[qid] !== undefined) await saveAnswerAction({ attemptId: view.attemptId, questionId: qid, response: values[qid] });
    }
    const r = await submitAttemptAction(view.attemptId);
    setPending(false);
    if (!r.ok) return setError(r.error);
    setView(r.data);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  if (done) {
    const bySkill = new Map<string, { ok: number; n: number }>();
    for (const q of view.questions) {
      const k = q.skill ?? "autre";
      const cur = bySkill.get(k) ?? { ok: 0, n: 0 };
      bySkill.set(k, { ok: cur.ok + (q.result?.fraction ?? 0), n: cur.n + 1 });
    }
    return (
      <div className="space-y-6">
        <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-[var(--radius-panel)] border p-6", view.passed ? "border-ok/30 bg-ok-wash" : "border-line bg-surface")}>
          <p className="text-sm text-muted">{view.status === "expired" ? "Temps écoulé : vos réponses enregistrées ont été corrigées." : "Évaluation terminée"}</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{view.percent} %</p>
          <p className="mt-1 text-[15px] text-ink-2">
            {view.assessment.kind === "placement"
              ? "Merci. Ce positionnement n'est pas une note : il sert à vous recommander par où commencer."
              : view.passed
                ? `Réussi (seuil ${view.assessment.passPercent} %).`
                : `Seuil de réussite : ${view.assessment.passPercent} %. Relisez les explications puis réessayez.`}
          </p>
          {view.attestationCode ? (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-[15px] text-ink">
              <BadgeCheck className="h-5 w-5 text-gold" aria-hidden="true" /> Attestation interne délivrée, code de vérification{" "}
              <code className="inline-code">{formatCode(view.attestationCode)}</code>
              <Link href="/campus/attestations" className="text-sm underline underline-offset-4">
                Voir mes attestations
              </Link>
            </p>
          ) : null}
        </motion.div>
        {view.assessment.isProtected ? (
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-6">
            <p className="font-medium">Résultats par compétence</p>
            <p className="mt-1 text-sm text-muted">Pour préserver l&apos;examen, les réponses attendues ne sont pas affichées. Travaillez les compétences les plus faibles avec l&apos;examen blanc et les leçons associées.</p>
            <ul className="mt-4 space-y-2">
              {[...bySkill].map(([k, v]) => (
                <li key={k} className="flex justify-between text-sm">
                  <span className="text-ink-2">{SKILLS.find((s) => s.code === k)?.name ?? k}</span>
                  <span className="tabular-nums">{Math.round((v.ok / v.n) * 100)} %</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="space-y-4">
            {view.questions.map((q, i) => (
              <li key={q.id} className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
                <p className="font-medium text-ink">
                  <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
                  <span className="whitespace-pre-line">{q.prompt}</span>
                </p>
                <div className="mt-3">
                  <QuestionInput id={q.id} question={q.question} value={values[q.id]} onChange={() => {}} disabled />
                </div>
                {q.result ? <QuestionResult question={q.question} result={q.result} /> : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  const q = view.questions[index];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
      <div className="space-y-4">
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-6">
          <p className="text-sm text-muted">
            Question {index + 1} sur {view.questions.length}
          </p>
          <p className="mt-2 whitespace-pre-line text-[17px] font-medium leading-relaxed text-ink">{q.prompt}</p>
          <div className="mt-5">
            <QuestionInput id={q.id} question={q.question} value={values[q.id]} onChange={(v) => change(q.id, v)} />
          </div>
          <p className="mt-3 h-4 text-xs text-muted" aria-live="polite">
            {saving === q.id ? "Enregistrement…" : isAnswered(q.question, values[q.id]) ? "Réponse enregistrée" : ""}
          </p>
        </div>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <div className="flex justify-between">
          <Button variant="secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            Précédente
          </Button>
          {index < view.questions.length - 1 ? (
            <Button onClick={() => setIndex((i) => i + 1)}>Suivante</Button>
          ) : (
            <Button onClick={submit} disabled={pending}>
              {pending ? "Correction…" : "Terminer et corriger"}
            </Button>
          )}
        </div>
      </div>
      <aside className="space-y-4">
        {left !== null ? (
          <div className={cn("rounded-[var(--radius-panel)] border p-4", left < 300 ? "border-warn/40 bg-warn-wash" : "border-line bg-surface")} role="timer" aria-live={left < 60 ? "assertive" : "off"}>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Clock className="h-4 w-4" aria-hidden="true" /> Temps restant
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </p>
          </div>
        ) : null}
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-4">
          <p className="text-sm text-muted">
            {answered}/{view.questions.length} réponses
          </p>
          <ol className="mt-3 grid grid-cols-6 gap-1.5" aria-label="Aller à la question">
            {view.questions.map((qq, i) => (
              <li key={qq.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index ? "step" : undefined}
                  aria-label={`Question ${i + 1}${isAnswered(qq.question, values[qq.id]) ? ", répondue" : ""}`}
                  className={cn(
                    "h-8 w-full rounded-md text-xs tabular-nums transition",
                    i === index ? "bg-ink text-paper" : isAnswered(qq.question, values[qq.id]) ? "bg-signal-wash text-signal-ink" : "bg-mist text-muted hover:text-ink",
                  )}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
          <Button className="mt-4 w-full" variant="secondary" onClick={submit} disabled={pending}>
            Terminer maintenant
          </Button>
          {view.assessment.isProtected ? <Badge className="mt-3">Examen surveillé : tuteur IA désactivé</Badge> : null}
        </div>
      </aside>
    </div>
  );
}
