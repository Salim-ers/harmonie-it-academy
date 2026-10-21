"use client";

import { motion } from "motion/react";
import { useSteps, type DiagramStep } from "./frame";
import { Box, DiagramShell, Label, MONO } from "./shared";

const COMMAND = "Get-Process | Where-Object CPU -gt 100 | Sort-Object CPU -Descending | Select-Object -First 5";

const STEPS: DiagramStep[] = [
  {
    title: "Get-Process produit des objets",
    description:
      "Chaque processus sort du cmdlet sous forme d'objet Process, avec des propriétés (Name, Id, CPU, WorkingSet…), pas sous forme de lignes de texte. Ils sortent triés par nom. Extrait simplifié : 10 objets.",
  },
  {
    title: "Where-Object CPU -gt 100 filtre",
    description:
      "Pour chaque objet, Where-Object lit la propriété CPU (secondes de processeur consommées) et ne laisse passer que ceux dont la valeur est supérieure à 100. Six objets passent, quatre sont écartés.",
  },
  {
    title: "Sort-Object CPU -Descending trie",
    description:
      "Les six objets sont rangés selon la valeur numérique de leur propriété CPU, de la plus grande à la plus petite. Ce sont toujours les mêmes objets, seul l'ordre change.",
  },
  {
    title: "Select-Object -First 5 garde les cinq premiers",
    description: "Seuls les cinq premiers objets de la liste triée continuent. EXCEL, sixième, s'arrête ici. Le résultat est encore une liste d'objets, réutilisable par une autre commande.",
  },
  {
    title: "L'affichage, en texte, seulement à la fin",
    description:
      "Au bout du pipeline, PowerShell met en forme les objets restants dans un tableau à l'écran. Le texte n'apparaît qu'à cette dernière étape : c'est pour cela qu'on peut filtrer et trier par propriété sans découper de texte.",
  },
];

const STAGES = [
  ["Get-Process"],
  ["Where-Object", "CPU -gt 100"],
  ["Sort-Object CPU", "-Descending"],
  ["Select-Object", "-First 5"],
];

/** Extrait fictif, dans l'ordre de sortie de Get-Process (tri par nom). */
const PROCS = [
  { name: "chrome", cpu: 412.6 },
  { name: "Code", cpu: 131.0 },
  { name: "EXCEL", cpu: 104.8 },
  { name: "explorer", cpu: 96.2 },
  { name: "MsMpEng", cpu: 155.4 },
  { name: "OUTLOOK", cpu: 233.9 },
  { name: "SearchHost", cpu: 7.5 },
  { name: "svchost", cpu: 48.1 },
  { name: "Teams", cpu: 287.3 },
  { name: "WINWORD", cpu: 18.7 },
];

const FILTERED = PROCS.filter((p) => p.cpu > 100);
const SORTED = [...FILTERED].sort((a, b) => b.cpu - a.cpu);
const FIRST = SORTED.slice(0, 5);
const COUNTS = [PROCS.length, FILTERED.length, SORTED.length, FIRST.length];

const COL_X = [68, 196, 324, 452];
const CARD_W = 112;
const ROW = (i: number) => 92 + i * 22;

type Place = { col: number; idx: number; dropped: boolean };

function placeOf(name: string, step: number): Place {
  const orig = PROCS.findIndex((p) => p.name === name);
  if (step === 0) return { col: 0, idx: orig, dropped: false };
  const fi = FILTERED.findIndex((p) => p.name === name);
  if (fi < 0) return { col: 0, idx: orig, dropped: true };
  if (step === 1) return { col: 1, idx: fi, dropped: false };
  const si = SORTED.findIndex((p) => p.name === name);
  if (step === 2) return { col: 2, idx: si, dropped: false };
  if (si >= 5) return { col: 2, idx: si, dropped: true };
  return { col: 3, idx: si, dropped: false };
}

export default function PowershellPipelineDiagram() {
  const s = useSteps(STEPS.length, { autoplayMs: 2600 });
  const { step, reduced } = s;
  const stage = Math.min(step, 3);
  const asText = step === 4;
  return (
    <DiagramShell
      title={`Pipeline PowerShell : ${COMMAND}. Des objets traversent le pipeline et sont filtrés puis triés.`}
      steps={STEPS}
      state={s}
      stepExtra={
        <p className="font-mono text-[13px] text-ink-2">
          <span className="sr-only">Commande : </span>
          {COMMAND}
        </p>
      }
    >
      <svg viewBox="0 0 520 318" className="h-auto w-full" aria-hidden="true">
        {STAGES.map((lines, i) => (
          <g key={i}>
            <Box x={COL_X[i]} y={34} w={120} h={48} label={lines.join("\n")} monoLabel labelSize={12} active={stage === i && !asText} wash={stage === i} />
            {i < 3 ? (
              <text x={COL_X[i] + 64} y={39} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--signal)" fontFamily={MONO}>
                |
              </text>
            ) : null}
            {step >= i ? (
              <Label x={COL_X[i]} y={72} color={stage === i ? "var(--signal)" : "var(--muted)"}>
                {`${COUNTS[i]} objets`}
              </Label>
            ) : null}
          </g>
        ))}

        {asText ? (
          <motion.rect
            x={COL_X[3] - CARD_W / 2 - 4}
            y={ROW(0) - 14}
            width={CARD_W + 8}
            height={ROW(4) - ROW(0) + 28}
            rx={8}
            fill="var(--term-bg)"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        ) : null}

        {PROCS.map((p, i) => {
          const pl = placeOf(p.name, step);
          const text = asText && pl.col === 3 && !pl.dropped;
          return (
            <motion.g
              key={p.name}
              initial={reduced ? false : { x: COL_X[0], y: ROW(i) - 10, opacity: 0 }}
              animate={{ x: COL_X[pl.col], y: ROW(pl.idx), opacity: pl.dropped ? 0.45 : 1 }}
              transition={reduced ? { duration: 0 } : { duration: 0.9, ease: "easeInOut", delay: step === 0 ? i * 0.06 : 0 }}
            >
              {!text ? (
                <rect
                  x={-CARD_W / 2}
                  y={-10}
                  width={CARD_W}
                  height={20}
                  rx={6}
                  fill={pl.dropped ? "var(--danger-wash)" : pl.col === stage ? "var(--signal-wash)" : "var(--surface)"}
                  stroke={pl.dropped ? "var(--danger)" : pl.col === stage ? "var(--signal)" : "var(--line-strong)"}
                  strokeDasharray={pl.dropped ? "3 2" : undefined}
                />
              ) : null}
              <text
                x={-CARD_W / 2 + 7}
                y={4}
                fontSize={12}
                fontFamily={MONO}
                fill={text ? "var(--term-fg)" : pl.dropped ? "var(--muted)" : "var(--ink)"}
                textDecoration={pl.dropped ? "line-through" : undefined}
              >
                {p.name}
              </text>
              <text x={CARD_W / 2 - 7} y={4} textAnchor="end" fontSize={12} fontFamily={MONO} fill={text ? "var(--term-ok)" : "var(--muted)"}>
                {p.cpu.toFixed(1)}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </DiagramShell>
  );
}
