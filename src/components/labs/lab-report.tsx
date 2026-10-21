"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Check, Printer, RotateCcw, X } from "lucide-react";
import type { LabViewData } from "@/server/services/labs";
import { portfolioAction, startLabAction } from "@/server/actions/labs";
import { RubricFeedback } from "@/components/assessment/question-result";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function LabReportView({ lab }: { lab: LabViewData }) {
  const r = lab.report!;
  const d = lab.debrief!;
  const router = useRouter();
  const reduced = useReducedMotion();
  const [inPortfolio, setInPortfolio] = useState(lab.inPortfolio);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-6 text-center">
          <p className="text-sm text-muted">Score de l&apos;intervention</p>
          <motion.p
            initial={reduced ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 16 }}
            className={cn("mt-2 text-6xl font-semibold tabular-nums tracking-tight", r.score >= 70 ? "text-ok" : r.score >= 50 ? "text-warn" : "text-danger")}
          >
            {r.score}
          </motion.p>
          <p className="text-sm text-muted">sur 100</p>
          <p className={cn("mt-4 inline-flex items-center gap-1.5 text-sm font-medium", r.resolved ? "text-ok" : "text-danger")}>
            {r.resolved ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
            {r.resolved ? "Service rétabli" : "Ticket clôturé sans résolution"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {r.minutes} min simulées pour un SLA de {r.slaMinutes} min
          </p>
        </div>
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-6">
          <p className="font-medium text-ink">Détail du barème</p>
          <ul className="mt-4 space-y-3">
            {r.breakdown.map((b, i) => (
              <motion.li key={b.key} initial={reduced ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduced ? 0 : 0.08 * i }} className="grid grid-cols-[1fr_auto] gap-x-4 text-sm">
                <span className="text-ink">{b.label}</span>
                <span className={cn("tabular-nums", b.points < 0 ? "text-danger" : "text-ink")}>
                  {b.points}
                  {b.max ? ` / ${b.max}` : ""}
                </span>
                <span className="col-span-2 text-muted">{b.detail}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[var(--radius-panel)] border border-line bg-surface p-6" aria-labelledby="cause">
          <h2 id="cause" className="font-medium text-ink">
            La cause réelle
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d.cause}</p>
          <h3 className="mt-5 text-sm font-medium text-ink">Les indices qui permettaient de la trouver</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
            {d.clues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-medium text-ink">Les tests pertinents</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
            {d.relevantTests.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          {r.keyActionsMissed.length ? (
            <p className="mt-4 text-sm text-warn">Vérifications décisives non réalisées : {r.keyActionsMissed.join(" ; ")}.</p>
          ) : null}
          {r.dangerousActions.length ? (
            <div className="mt-4 rounded-[var(--radius-control)] bg-danger-wash px-4 py-3 text-sm">
              <p className="font-medium text-ink">Actions à risque réalisées</p>
              {r.dangerousActions.map((a) => (
                <p key={a.label} className="mt-1 text-ink-2">
                  <span className="font-medium">{a.label}.</span> {a.explanation}
                </p>
              ))}
            </div>
          ) : null}
        </section>
        <section className="rounded-[var(--radius-panel)] border border-line bg-surface p-6" aria-labelledby="hyp">
          <h2 id="hyp" className="font-medium text-ink">
            Pourquoi les autres hypothèses ne tenaient pas
          </h2>
          <ul className="mt-2 space-y-2.5 text-[15px]">
            {d.wrongHypotheses.map((h) => (
              <li key={h.hypothesis}>
                <span className="font-medium text-ink">{h.hypothesis}.</span> <span className="text-ink-2">{h.why}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-medium text-ink">La procédure de résolution</h3>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[15px] text-ink-2">
            {d.procedure.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <h3 className="mt-5 text-sm font-medium text-ink">Comment éviter que cela se reproduise</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
            {d.prevention.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="grid gap-5 lg:grid-cols-2" aria-label="Documentation">
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-6">
          <h2 className="font-medium text-ink">Votre note de clôture</h2>
          <p className="mt-2 whitespace-pre-wrap rounded-[var(--radius-control)] bg-mist px-4 py-3 text-[15px] text-ink-2">{r.closingNote || "(vide)"}</p>
          <RubricFeedback rubric={r.noteGrade} />
        </div>
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-6">
          <h2 className="font-medium text-ink">Une note de clôture exemplaire</h2>
          <p className="mt-2 rounded-[var(--radius-control)] bg-ok-wash px-4 py-3 text-[15px] leading-relaxed text-ink-2">{d.exampleClosingNote}</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-line bg-surface px-5 py-4 no-print">
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--signal)]"
            checked={inPortfolio}
            disabled={busy}
            onChange={async (e) => {
              setBusy(true);
              const next = e.target.checked;
              const res = await portfolioAction(lab.sessionId, next);
              setBusy(false);
              if (res.ok) setInPortfolio(next);
            }}
          />
          Ajouter ce compte rendu à mon portfolio (visible uniquement si mon passeport est public)
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" /> Imprimer
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await startLabAction(lab.scenarioSlug, true);
              setBusy(false);
              if (res.ok) router.refresh();
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Recommencer l&apos;incident
          </Button>
        </div>
      </div>
    </div>
  );
}
