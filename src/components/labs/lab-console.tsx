"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ClipboardCheck,
  Eye,
  FileText,
  Lightbulb,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  TerminalSquare,
  Wrench,
} from "lucide-react";
import type { LabViewData } from "@/server/services/labs";
import { closeLabAction, labStepAction } from "@/server/actions/labs";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { LabReportView } from "./lab-report";

const CATEGORY: Record<string, { label: string; icon: typeof Eye }> = {
  interroger: { label: "Interroger", icon: MessageSquare },
  observer: { label: "Observer", icon: Eye },
  tester: { label: "Tester", icon: TerminalSquare },
  consulter: { label: "Consulter", icon: Search },
  corriger: { label: "Intervenir", icon: Wrench },
  escalader: { label: "Escalader", icon: Send },
};
const ORDER = ["interroger", "observer", "tester", "consulter", "corriger", "escalader"];

type Pending = { label: string; risk: { level: "caution" | "dangerous"; explanation: string }; actionId: string } | null;

export function LabConsole({ initial }: { initial: LabViewData }) {
  const [lab, setLab] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pending>(null);
  const [note, setNote] = useState("");
  const [isPending, start] = useTransition();
  const journalEnd = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const v = lab.view;

  const groups = useMemo(() => ORDER.map((c) => ({ c, actions: v.actions.filter((a) => a.category === c) })).filter((g) => g.actions.length), [v.actions]);

  function step(s: Parameters<typeof labStepAction>[1]) {
    setError(null);
    start(async () => {
      const r = await labStepAction(lab.sessionId, s);
      if (!r.ok) return setError(r.error);
      if (r.data.needsConfirmation) {
        if (s.kind === "action") setConfirm({ label: r.data.label, risk: r.data.risk, actionId: s.actionId });
        return;
      }
      setConfirm(null);
      setLab(r.data.lab);
      requestAnimationFrame(() => journalEnd.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" }));
    });
  }

  function close() {
    setError(null);
    start(async () => {
      const r = await closeLabAction(lab.sessionId, note);
      if (!r.ok) return setError(r.error);
      setLab(r.data);
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
  }

  if (lab.status === "closed" && lab.report && lab.debrief) {
    return <LabReportView lab={lab} />;
  }

  const t = v.ticket;
  const slaPct = Math.min(100, (v.state.minutes / t.slaMinutes) * 100);
  return (
    <div className="grid gap-5 2xl:grid-cols-[320px_minmax(0,1fr)_340px] xl:grid-cols-[300px_minmax(0,1fr)]">
      {/* Ticket et actions */}
      <aside className="space-y-4" aria-label="Ticket et actions">
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted">{t.reference}</span>
            <Badge tone={t.urgency === "haute" ? "danger" : t.urgency === "moyenne" ? "warn" : "neutral"}>Urgence {t.urgency}</Badge>
          </div>
          <p className="mt-2 font-medium text-ink">{t.title}</p>
          <p className="mt-1 text-sm text-muted">
            {t.reporter.name}, {t.reporter.role}, {t.reporter.site}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{t.description}</p>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted">
              <span>Temps simulé : {v.state.minutes} min</span>
              <span>SLA {t.slaMinutes} min</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={v.state.minutes} aria-valuemax={t.slaMinutes} aria-label="Temps consommé sur le SLA">
              <div className={cn("h-full rounded-full transition-[width] duration-500", slaPct >= 100 ? "bg-danger" : slaPct > 70 ? "bg-warn" : "bg-signal")} style={{ width: `${slaPct}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-4">
          <p className="text-sm font-medium text-ink">Que faites-vous ?</p>
          <div className="mt-3 space-y-4">
            {groups.map((g) => {
              const C = CATEGORY[g.c];
              return (
                <div key={g.c}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
                    <C.icon className="h-3.5 w-3.5" aria-hidden="true" /> {C.label}
                  </p>
                  <ul className="space-y-1">
                    {g.actions.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => step({ kind: "action", actionId: a.id })}
                          className={cn(
                            "flex w-full items-start justify-between gap-2 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-sm transition disabled:opacity-60",
                            a.done ? "text-muted hover:bg-mist" : "text-ink hover:bg-mist",
                          )}
                        >
                          <span className="flex items-start gap-1.5">
                            {a.warn === "dangerous" ? <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-label="Action à risque" /> : null}
                            {a.done ? <span className="sr-only">Déjà fait : </span> : null}
                            <span className={a.done ? "line-through decoration-line-strong" : ""}>{a.label}</span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted">{a.minutes} min</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Journal d'intervention */}
      <section className="min-w-0 rounded-[var(--radius-panel)] border border-line bg-surface" aria-label="Journal d'intervention">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="text-sm font-medium text-ink">Journal d&apos;intervention</p>
          <p className="text-xs text-muted">{v.company.name}</p>
        </div>
        <div className="max-h-[70vh] min-h-[420px] space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
          {lab.events.length === 0 ? (
            <div className="rounded-[var(--radius-control)] border border-dashed border-line-strong p-5 text-[15px] text-muted">
              <p className="text-ink">{v.company.description}</p>
              <p className="mt-2">Commencez par comprendre la situation. Chaque action coûte du temps simulé ; certaines sont risquées. Rien de ce que vous faites ici ne peut casser quoi que ce soit.</p>
            </div>
          ) : null}
          <AnimatePresence initial={false}>
            {lab.events.map((e) => (
              <motion.div key={e.seq} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <JournalEntry event={e} />
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={journalEnd} />
        </div>
        {error ? (
          <div className="px-5 pb-4">
            <FormMessage>{error}</FormMessage>
          </div>
        ) : null}
      </section>

      {/* Raisonnement */}
      <aside className="space-y-4 xl:col-span-2 2xl:col-span-1" aria-label="Diagnostic et clôture">
        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <FileText className="h-4 w-4 text-signal" aria-hidden="true" /> Carnet d&apos;indices
          </p>
          {v.clues.length ? (
            <ul className="mt-2.5 space-y-1.5 text-sm text-ink-2">
              {v.clues.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true" />
                  {c.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Les faits établis par vos vérifications s&apos;ajoutent ici.</p>
          )}
        </div>

        <details className="group rounded-[var(--radius-panel)] border border-line bg-surface p-4" open={v.clues.length >= 2 && !v.state.diagnosisFound}>
          <summary className="cursor-pointer list-none text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            1. Poser le diagnostic {v.state.diagnosisFound ? <Badge tone="ok" className="ml-1">Validé</Badge> : null}
          </summary>
          {!v.state.diagnosisFound ? (
            <ul className="mt-3 space-y-1.5">
              {v.diagnoses.map((d) => (
                <li key={d.id}>
                  <button type="button" disabled={isPending} onClick={() => step({ kind: "diagnosis", diagnosisId: d.id })} className="w-full rounded-[var(--radius-control)] border border-line px-3 py-2 text-left text-sm text-ink transition hover:border-line-strong disabled:opacity-60">
                    {d.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Le diagnostic est établi. Passez à la résolution.</p>
          )}
        </details>

        <details className="rounded-[var(--radius-panel)] border border-line bg-surface p-4" open={v.state.diagnosisFound && !v.state.fixed}>
          <summary className="cursor-pointer list-none text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            2. Résoudre {v.state.fixed ? <Badge tone="ok" className="ml-1">Service rétabli</Badge> : null}
          </summary>
          <ul className="mt-3 space-y-1.5">
            {v.resolutions.map((r) => (
              <li key={r.id}>
                <button type="button" disabled={isPending || v.state.fixed} onClick={() => step({ kind: "resolution", resolutionId: r.id })} className="w-full rounded-[var(--radius-control)] border border-line px-3 py-2 text-left text-sm text-ink transition hover:border-line-strong disabled:opacity-50">
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
          {v.state.fixed ? <p className="mt-2 text-sm text-muted">Pensez à vérifier que tout fonctionne avant de clôturer.</p> : null}
        </details>

        <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <ClipboardCheck className="h-4 w-4 text-signal" aria-hidden="true" /> 3. Clôturer le ticket
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-3 min-h-32 text-sm"
            aria-label="Note de clôture"
            placeholder="Cause, action réalisée, vérification, prévention. Écrivez-la comme si un collègue devait la relire demain."
          />
          <Button className="mt-3 w-full" disabled={isPending || note.trim().split(/\s+/).length < 8} onClick={close}>
            Clôturer et voir le débrief
          </Button>
          {!v.state.fixed ? <p className="mt-2 text-xs text-warn">Le service n&apos;est pas encore rétabli : clôturer maintenant sera compté comme un ticket non résolu.</p> : null}
        </div>

        <div className="flex items-center justify-between rounded-[var(--radius-panel)] border border-line bg-surface px-4 py-3">
          <span className="text-sm text-muted">{lab.hintsAvailable} indice(s) disponible(s), −3 points chacun</span>
          <Button variant="secondary" size="sm" disabled={isPending || lab.hintsAvailable === 0} onClick={() => step({ kind: "hint" })}>
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" /> Indice
          </Button>
        </div>
      </aside>

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="risk-title">
          <div className="w-full max-w-md rounded-[var(--radius-panel)] border border-danger/40 bg-surface p-5 shadow-[var(--shadow-lift)]">
            <p id="risk-title" className="flex items-center gap-2 font-medium text-ink">
              <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" /> Action à risque : {confirm.label}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{confirm.risk.explanation}</p>
            <p className="mt-2 text-sm text-muted">En entreprise, cette action demanderait une autorisation. Ici, vous pouvez la tenter pour voir ses conséquences : elle sera comptée dans votre score de sécurité.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(null)} autoFocus>
                Renoncer
              </Button>
              <Button variant="danger" onClick={() => step({ kind: "action", actionId: confirm.actionId, confirmRisk: true })}>
                Exécuter quand même
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function JournalEntry({ event }: { event: LabViewData["events"][number] }) {
  const p = event.payload as Record<string, unknown>;
  if (event.type === "action") {
    const terminal = p.terminal as { shell: string; lines: string[] } | undefined;
    const risk = p.risk as { level: string } | undefined;
    const clues = (p.newClues as { id: string; label: string }[] | undefined) ?? [];
    return (
      <div className="space-y-2">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="tabular-nums text-muted">{event.seq}.</span>
          <span className="font-medium text-ink">{String(p.label)}</span>
          <span className="text-xs text-muted">+{String(p.minutes)} min</span>
          {risk?.level === "dangerous" ? <Badge tone="danger">Action à risque</Badge> : null}
        </p>
        <p className="text-[15px] leading-relaxed text-ink-2">{String(p.text)}</p>
        {terminal ? (
          <pre className="overflow-x-auto rounded-[10px] bg-term-bg px-4 py-3 font-mono text-[12.5px] leading-relaxed text-term-fg">{terminal.lines.join("\n")}</pre>
        ) : null}
        {clues.map((c) => (
          <p key={c.id} className="flex items-center gap-2 text-sm text-signal-ink">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Nouvel indice : {c.label}
          </p>
        ))}
      </div>
    );
  }
  if (event.type === "hint") {
    return (
      <div className="rounded-[var(--radius-control)] bg-warn-wash px-4 py-3 text-[15px]">
        <p className="text-sm font-medium text-ink">Indice {String(p.level)}</p>
        <p className="mt-0.5 text-ink-2">{String(p.hint)}</p>
      </div>
    );
  }
  const ok = Boolean(p.correct);
  return (
    <div className={cn("rounded-[var(--radius-control)] border px-4 py-3 text-[15px]", ok ? "border-ok/30 bg-ok-wash" : "border-danger/30 bg-danger-wash")}>
      <p className="text-sm font-medium text-ink">
        {event.type === "diagnosis" ? "Diagnostic proposé" : "Résolution appliquée"} : {String(p.label)}
      </p>
      <p className="mt-1 text-ink-2">{String(p.feedback)}</p>
    </div>
  );
}
