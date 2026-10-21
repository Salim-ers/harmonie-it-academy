"use client";

/**
 * Démonstration de la page d'accueil : un vrai mini-diagnostic jouable sans compte.
 * Données fictives et autonomes (ce n'est pas un laboratoire noté).
 */
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CircleAlert, TerminalSquare } from "lucide-react";
import { cn } from "@/lib/cn";

type ActionId = "ipconfig" | "voisin" | "prise";
const ACTIONS: { id: ActionId; label: string; command?: string; output: string[]; clue: string }[] = [
  {
    id: "ipconfig",
    label: "Lire la configuration IP",
    command: "ipconfig",
    output: ["Carte Ethernet Ethernet :", "   Statut du média. . . . . : Média connecté", "   Adresse IPv4 de configuration automatique : 169.254.112.9", "   Passerelle par défaut. . . . . . . :"],
    clue: "Adresse 169.254 (APIPA) : aucun serveur DHCP n'a répondu, mais le câble est bien branché.",
  },
  {
    id: "voisin",
    label: "Comparer avec le poste voisin",
    output: ["Poste PC-CPT-009 (même bureau) : 10.20.10.64, Internet et Teams fonctionnent."],
    clue: "Le DHCP fonctionne pour ce réseau : la panne est propre au branchement de ce poste.",
  },
  {
    id: "prise",
    label: "Brancher sur l'autre prise du bureau",
    output: ["Prise 2.14-A : adresse 10.20.10.88 obtenue en 3 secondes.", "Prise 2.14-B : 169.254.112.9"],
    clue: "La prise 2.14-B est probablement brassée sur un autre réseau, sans DHCP.",
  },
];

const DIAGNOSES = [
  { id: "app", label: "Teams et Outlook sont corrompus", correct: false, feedback: "Toutes les applications réseau échouent en même temps : ce ne sont pas elles. L'adresse 169.254 pointe le réseau." },
  { id: "dhcp", label: "Le serveur DHCP de l'entreprise est en panne", correct: false, feedback: "Le voisin obtient une adresse : le serveur DHCP répond pour ce réseau." },
  { id: "prise", label: "La prise du nouveau bureau est sur le mauvais réseau", correct: true, feedback: "Exact. Vous contournez en changeant de prise et vous escaladez au N2 réseau avec le numéro de prise : un ticket propre, en moins de dix minutes." },
];

export function IncidentConsole() {
  const [done, setDone] = useState<ActionId[]>([]);
  const [current, setCurrent] = useState<ActionId | null>(null);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const act = ACTIONS.find((a) => a.id === current);
  const chosen = DIAGNOSES.find((d) => d.id === diagnosis);
  const canDiagnose = done.length >= 2;
  const solved = Boolean(chosen?.correct);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-lift)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={cn("h-2 w-2 rounded-full", solved ? "bg-ok" : "bg-warn")} aria-hidden="true" />
            <span className="font-mono text-xs text-muted">INC-2026-05230</span>
          </div>
          <span className="text-xs text-muted">Priorité 3, SLA 4 h</span>
        </div>
        <div className="space-y-1 px-4 pt-4">
          <p className="font-medium text-ink">« Depuis mon changement de bureau, je n&apos;ai plus rien. »</p>
          <p className="text-sm text-muted">Claire Lefort, comptabilité, Groupe Valmont. Ni Internet, ni Teams, ni le partage réseau.</p>
        </div>

        <div className="flex flex-wrap gap-2 px-4 pt-4" role="group" aria-label="Vérifications possibles">
          {ACTIONS.map((a) => {
            const isDone = done.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setCurrent(a.id);
                  setDone((d) => (d.includes(a.id) ? d : [...d, a.id]));
                }}
                aria-pressed={current === a.id}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border px-3 text-sm transition",
                  current === a.id ? "border-signal bg-signal-wash text-signal-ink" : "border-line-strong text-ink-2 hover:border-ink-2",
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" /> : <TerminalSquare className="h-3.5 w-3.5" aria-hidden="true" />}
                {a.label}
              </button>
            );
          })}
        </div>

        <div className="mx-4 mt-4 min-h-[148px] rounded-[10px] bg-term-bg p-4 font-mono text-[12.5px] leading-relaxed text-term-fg" aria-live="polite">
          <AnimatePresence mode="wait">
            {act ? (
              <motion.div key={act.id} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {act.command ? (
                  <p>
                    <span className="text-term-prompt">C:\&gt;</span> {act.command}
                  </p>
                ) : null}
                {act.output.map((l, i) => (
                  <p key={i} className={cn("whitespace-pre-wrap", l.includes("169.254") && "text-term-err")}>
                    {l}
                  </p>
                ))}
              </motion.div>
            ) : (
              <motion.p key="idle" className="text-term-dim" initial={false} animate={{ opacity: 1 }}>
                Choisissez une vérification. Chaque résultat est cohérent avec la vraie cause de la panne.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 py-4">
          {done.length ? (
            <ul className="space-y-1.5" aria-label="Indices relevés">
              {ACTIONS.filter((a) => done.includes(a.id)).map((a) => (
                <li key={a.id} className="flex gap-2 text-sm text-ink-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true" />
                  {a.clue}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Les indices que vous relevez s&apos;inscrivent ici.</p>
          )}

          {canDiagnose ? (
            <fieldset className="mt-4 border-t border-line pt-4">
              <legend className="mb-2 text-sm font-medium text-ink">Votre diagnostic</legend>
              <div className="grid gap-2">
                {DIAGNOSES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDiagnosis(d.id)}
                    aria-pressed={diagnosis === d.id}
                    className={cn(
                      "rounded-[var(--radius-control)] border px-3 py-2 text-left text-sm transition",
                      diagnosis === d.id ? (d.correct ? "border-ok bg-ok-wash text-ink" : "border-danger/50 bg-danger-wash text-ink") : "border-line hover:border-line-strong",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {chosen ? (
                <p className={cn("mt-3 flex gap-2 text-sm", chosen.correct ? "text-ok" : "text-danger")} role="status">
                  {chosen.correct ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span className="text-ink-2">{chosen.feedback}</span>
                </p>
              ) : null}
            </fieldset>
          ) : null}
        </div>
      </div>
      {solved ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-ok/30 bg-ok-wash px-4 py-3"
        >
          <p className="text-sm text-ink">Dans un vrai laboratoire, ce diagnostic serait noté, débriefé et ajouté à votre portfolio.</p>
          <Link href="/inscription?suite=/campus/laboratoires/apipa-bureau-demenage" className="text-sm font-medium text-ok underline-offset-4 hover:underline">
            Traiter l&apos;incident complet
          </Link>
        </motion.div>
      ) : null}
    </div>
  );
}
