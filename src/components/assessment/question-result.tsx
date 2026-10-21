import { Check, CircleAlert, X } from "lucide-react";
import type { GradeResult, PublicQuestion } from "@/server/engines/grading";
import { cn } from "@/lib/cn";

type Result = { fraction: number; correct: boolean; explanation: string; detail: GradeResult["detail"] };

function labelOf(q: PublicQuestion, id: string) {
  if (q.type === "single" || q.type === "multiple") return q.choices.find((c) => c.id === id)?.text ?? id;
  if (q.type === "order") return q.items.find((c) => c.id === id)?.text ?? id;
  if (q.type === "match") return q.right.find((c) => c.id === id)?.text ?? id;
  return id;
}

/** Correction d'une question : verdict, bonne réponse, justification. */
export function QuestionResult({ question, result }: { question: PublicQuestion; result: Result }) {
  const partial = !result.correct && result.fraction > 0;
  const d = result.detail;
  return (
    <div
      className={cn(
        "mt-4 rounded-[var(--radius-control)] border px-4 py-3 text-[15px] leading-relaxed",
        result.correct ? "border-ok/30 bg-ok-wash" : partial ? "border-warn/40 bg-warn-wash" : "border-danger/30 bg-danger-wash",
      )}
      role="status"
    >
      <p className="flex items-center gap-2 font-medium text-ink">
        {result.correct ? <Check className="h-4 w-4 text-ok" aria-hidden="true" /> : partial ? <CircleAlert className="h-4 w-4 text-warn" aria-hidden="true" /> : <X className="h-4 w-4 text-danger" aria-hidden="true" />}
        {result.correct ? "Bonne réponse" : partial ? `Réponse partielle (${Math.round(result.fraction * 100)} %)` : "Réponse incorrecte"}
      </p>
      {!result.correct ? (
        <div className="mt-2 text-sm text-ink-2">
          {d.type === "single" ? <p>Réponse attendue : {labelOf(question, d.expected)}</p> : null}
          {d.type === "multiple" ? <p>Réponses attendues : {d.expected.map((e) => labelOf(question, e)).join(" ; ")}</p> : null}
          {d.type === "truefalse" ? <p>La bonne réponse était : {d.expected ? "vrai" : "faux"}.</p> : null}
          {d.type === "order" ? (
            <div>
              <p>Ordre attendu :</p>
              <ol className="mt-1 list-decimal pl-5">
                {d.expected.map((e) => (
                  <li key={e}>{labelOf(question, e)}</li>
                ))}
              </ol>
            </div>
          ) : null}
          {d.type === "fill" ? <p>Réponse attendue : <code className="inline-code">{d.expected[0]}</code></p> : null}
          {d.type === "match" && question.type === "match" ? (
            <ul className="mt-1 space-y-0.5">
              {question.left.map((l) => (
                <li key={l.id}>
                  {l.text} : {labelOf(question, d.expected[l.id])}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {d.type === "text_rubric" || (d.type === "truefalse" && d.justification) ? (
        <RubricFeedback rubric={d.type === "text_rubric" ? d.rubric : d.justification!} />
      ) : null}
      <p className="mt-2 text-ink-2">{result.explanation}</p>
    </div>
  );
}

export function RubricFeedback({ rubric }: { rubric: NonNullable<Extract<GradeResult["detail"], { type: "text_rubric" }>["rubric"]> }) {
  return (
    <div className="mt-2 space-y-2 text-sm">
      {rubric.matched.length ? (
        <div>
          <p className="font-medium text-ink">Notions présentes</p>
          <ul className="mt-0.5 space-y-0.5">
            {rubric.matched.map((m) => (
              <li key={m.id} className="flex gap-2 text-ink-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
                {m.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rubric.missing.length ? (
        <div>
          <p className="font-medium text-ink">Notions absentes ou non reconnues</p>
          <ul className="mt-0.5 space-y-0.5">
            {rubric.missing.map((m) => (
              <li key={m.id} className="flex gap-2 text-ink-2">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
                {m.label}
                {m.required ? <span className="text-danger">(indispensable)</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rubric.redFlags.length ? (
        <div>
          <p className="font-medium text-ink">Points de vigilance</p>
          <ul className="mt-0.5 space-y-0.5">
            {rubric.redFlags.map((f) => (
              <li key={f.id} className="flex gap-2 text-danger">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rubric.tooShort ? <p className="text-warn">Réponse trop courte pour être évaluée complètement ({rubric.wordCount} mots).</p> : null}
      <p className="text-xs text-muted">Correction automatique par grille : elle repère des notions, pas la qualité de votre expression. Un mentor peut relire vos travaux sur demande.</p>
    </div>
  );
}
