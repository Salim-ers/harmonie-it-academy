"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { Appear, ChoiceGroup, DiagramShell, InfoPanel, Label, MONO } from "./shared";

type ToolId = "taskmgr" | "services" | "events" | "reliability" | "disks" | "devices";

const TOOLS: Record<ToolId, { name: string[]; cmd: string; col: number; row: number; scope: string }> = {
  taskmgr: { name: ["Gestionnaire", "des tâches"], cmd: "taskmgr", col: 0, row: 0, scope: "le présent" },
  services: { name: ["Services"], cmd: "services.msc", col: 1, row: 0, scope: "l'arrière-plan" },
  events: { name: ["Observateur", "d'événements"], cmd: "eventvwr.msc", col: 2, row: 0, scope: "le passé détaillé" },
  reliability: { name: ["Moniteur", "de fiabilité"], cmd: "perfmon /rel", col: 0, row: 1, scope: "le passé, en résumé" },
  disks: { name: ["Gestion", "des disques"], cmd: "diskmgmt.msc", col: 1, row: 1, scope: "disques et partitions" },
  devices: { name: ["Gestionnaire de", "périphériques"], cmd: "devmgmt.msc", col: 2, row: 1, scope: "matériel et pilotes" },
};

type SymptomId = "slow" | "service" | "reboot" | "unknown" | "disk";
const SYMPTOMS: Record<SymptomId, { label: string; first: ToolId; then?: ToolId; how: string; next?: string }> = {
  slow: {
    label: "Poste lent",
    first: "taskmgr",
    then: "reliability",
    how: "Onglet Processus : triez par colonne Processeur, Mémoire ou Disque pour trouver ce qui consomme. L'onglet Performance montre si la mémoire ou le disque saturent.",
    next: "Si la lenteur a commencé à une date précise, le Moniteur de fiabilité montre ce qui a été installé ou a planté ce jour-là.",
  },
  service: {
    label: "Service qui ne démarre pas",
    first: "services",
    then: "events",
    how: "Vérifiez l'état du service, son type de démarrage (automatique, manuel, désactivé), le compte utilisé et l'onglet Dépendances.",
    next: "Le journal Système de l'Observateur d'événements, source Service Control Manager (par exemple l'ID 7000 ou 7009), donne la raison de l'échec.",
  },
  reboot: {
    label: "Redémarrages inattendus",
    first: "reliability",
    then: "events",
    how: "La chronologie affiche chaque « arrêt incorrect de Windows » et les plantages d'applications, jour par jour, avec ce qui a changé juste avant.",
    next: "Dans le journal Système, l'événement Kernel-Power 41 signale un redémarrage sans arrêt propre, l'ID 6008 un arrêt précédent inattendu.",
  },
  unknown: {
    label: "Périphérique inconnu",
    first: "devices",
    how: "Cherchez le triangle jaune sous « Autres périphériques ». Propriétés, onglet Détails, « ID du matériel » : il permet d'identifier le pilote à installer.",
  },
  disk: {
    label: "Disque ou clé invisible",
    first: "disks",
    how: "Un disque neuf apparaît « non initialisé » ou « non alloué », une clé peut n'avoir aucune lettre. La console montre aussi l'espace libre de chaque volume. Toute action ici modifie le disque : à faire seulement avec l'accord du N2.",
  },
};
const SYMPTOM_ORDER: SymptomId[] = ["slow", "service", "reboot", "unknown", "disk"];

const CW = 156;
const CH = 84;
const cx = (c: number) => 18 + c * (CW + 12) + CW / 2;
const cy = (r: number) => 64 + r * (CH + 14) + CH / 2;

export default function WindowsToolsDiagram() {
  const reduced = Boolean(useReducedMotion());
  const [sym, setSym] = useState<SymptomId | null>(null);
  const cur = sym ? SYMPTOMS[sym] : null;

  return (
    <DiagramShell
      title="Carte des outils de diagnostic Windows et symptôme correspondant"
      controls={
        <div>
          <ChoiceGroup label="Choisissez un symptôme" options={SYMPTOM_ORDER.map((id) => ({ id, label: SYMPTOMS[id].label }))} value={sym} onChange={setSym} />
          <InfoPanel
            title={
              cur ? (
                <>
                  Ouvrir d&apos;abord : {TOOLS[cur.first].name.join(" ")} (<code className="font-mono text-[13px]">{TOOLS[cur.first].cmd}</code>)
                </>
              ) : (
                "Six outils, six questions"
              )
            }
          >
            {cur ? (
              <>
                <p>{cur.how}</p>
                {cur.then && cur.next ? (
                  <p>
                    <span className="font-medium text-ink">
                      Ensuite : {TOOLS[cur.then].name.join(" ")} (<code className="font-mono text-[13px]">{TOOLS[cur.then].cmd}</code>).{" "}
                    </span>
                    {cur.next}
                  </p>
                ) : null}
              </>
            ) : (
              <p>
                Le Gestionnaire des tâches montre le présent, la console Services l&apos;arrière-plan, l&apos;Observateur d&apos;événements et le
                Moniteur de fiabilité le passé. La Gestion des disques et le Gestionnaire de périphériques montrent le matériel. Chacun s&apos;ouvre
                aussi avec Windows + R et la commande indiquée.
              </p>
            )}
          </InfoPanel>
        </div>
      }
    >
      <svg viewBox="0 0 520 268" className="h-auto w-full" aria-hidden="true">
        <rect x={18} y={14} width={484} height={34} rx={8} fill={cur ? "var(--signal-wash)" : "var(--mist)"} />
        <Label x={32} y={36} anchor="start" color="var(--muted)">
          Symptôme
        </Label>
        {cur ? (
          <Appear key={sym} reduced={reduced} dx={-6} dy={0}>
            <text x={106} y={36} fontSize={13} fontWeight={600} fill="var(--ink)">
              {cur.label}
            </text>
          </Appear>
        ) : (
          <text x={106} y={36} fontSize={13} fill="var(--muted)">
            à choisir sous la carte
          </text>
        )}

        {(Object.keys(TOOLS) as ToolId[]).map((id) => {
          const t = TOOLS[id];
          const first = cur?.first === id;
          const then = cur?.then === id;
          const dim = cur !== null && !first && !then;
          const x = cx(t.col);
          const y = cy(t.row);
          return (
            <g key={id} opacity={dim ? 0.4 : 1} className="motion-safe:transition-opacity motion-safe:duration-300">
              <rect
                x={x - CW / 2}
                y={y - CH / 2}
                width={CW}
                height={CH}
                rx={10}
                fill={first ? "var(--signal-wash)" : "var(--surface)"}
                stroke={first || then ? "var(--signal)" : "var(--line-strong)"}
                strokeWidth={first ? 2 : 1.25}
                strokeDasharray={then ? "5 3" : undefined}
              />
              {t.name.map((line, i) => (
                <text key={line} x={x} y={y - 18 + i * 16 + (t.name.length === 1 ? 8 : 0)} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">
                  {line}
                </text>
              ))}
              <text x={x} y={y + 14} textAnchor="middle" fontSize={12} fill="var(--muted)">
                {t.scope}
              </text>
              <text x={x} y={y + 32} textAnchor="middle" fontSize={12} fill="var(--ink-2)" fontFamily={MONO}>
                {t.cmd}
              </text>
              {first || then ? (
                <Appear key={`${sym}-${id}`} reduced={reduced} dy={0} delay={then ? 0.25 : 0}>
                  <circle cx={x + CW / 2 - 14} cy={y - CH / 2 + 14} r={9} fill={first ? "var(--signal)" : "var(--surface)"} stroke="var(--signal)" />
                  <text x={x + CW / 2 - 14} y={y - CH / 2 + 18} textAnchor="middle" fontSize={12} fontWeight={700} fill={first ? "var(--paper)" : "var(--signal)"}>
                    {first ? "1" : "2"}
                  </text>
                </Appear>
              ) : null}
            </g>
          );
        })}
      </svg>
    </DiagramShell>
  );
}
