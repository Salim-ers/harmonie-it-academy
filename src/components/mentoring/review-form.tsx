"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimSubmissionAction, gradeSubmissionAction } from "@/server/actions/mentoring";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/field";

type Rubric = { criterion: string; points: number; skill?: string }[];

export function ClaimButton({ id }: { id: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        onClick={() =>
          start(async () => {
            const r = await claimSubmissionAction(id);
            if (!r.ok) setErr(r.error);
          })
        }
        disabled={pending}
      >
        {pending ? "Prise en charge…" : "Prendre en charge la relecture"}
      </Button>
      {err ? <FormMessage>{err}</FormMessage> : null}
    </div>
  );
}

export function ReviewForm({ id, rubric }: { id: string; rubric: Rubric }) {
  const router = useRouter();
  const [points, setPoints] = useState<(number | "")[]>(rubric.map(() => ""));
  const [feedback, setFeedback] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const complete = points.every((p) => p !== "");
  const total = rubric.reduce((a, r) => a + r.points, 0);
  const got = points.reduce<number>((a, p) => a + (p === "" ? 0 : p), 0);
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await gradeSubmissionAction({ id, points: points.map((p) => (p === "" ? 0 : p)), feedback });
          if (r.ok) router.push("/studio/livrables");
          else setErr(r.error);
        });
      }}
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Grille</legend>
        {rubric.map((r, i) => (
          <div key={r.criterion} className="flex items-center justify-between gap-4 text-sm">
            <label htmlFor={`c-${i}`} className="text-ink-2">
              {r.criterion}
            </label>
            <span className="flex shrink-0 items-center gap-1.5">
              <input
                id={`c-${i}`}
                type="number"
                min={0}
                max={r.points}
                step={1}
                required
                value={points[i]}
                onChange={(e) => setPoints((p) => p.map((v, j) => (j === i ? (e.target.value === "" ? "" : Math.max(0, Math.min(r.points, Math.round(Number(e.target.value))))) : v)))}
                className="h-9 w-16 rounded-[var(--radius-control)] border border-line-strong bg-surface px-2 text-right tabular-nums"
              />
              <span className="w-10 text-muted">/ {r.points}</span>
            </span>
          </div>
        ))}
        <p className="border-t border-line pt-3 text-right text-sm tabular-nums text-ink">
          {got} / {total}, soit {Math.round((got / total) * 100)} / 100
        </p>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="feedback" className="text-sm font-medium text-ink">
          Retour à l&apos;apprenant
        </label>
        <Textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="min-h-48"
          placeholder="Ce qui est réussi, ce qu'il faut changer en priorité, un exemple de reformulation. Le détail de la grille est ajouté automatiquement."
        />
      </div>
      {err ? <FormMessage>{err}</FormMessage> : null}
      <Button type="submit" disabled={pending || !complete || feedback.trim().length < 120}>
        {pending ? "Envoi…" : "Envoyer la relecture"}
      </Button>
    </form>
  );
}
