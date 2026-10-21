"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Appear, Arrow, Box, DiagramShell, Label, MONO, TravelDot, type Pt } from "./shared";

const STEPS: DiagramStep[] = [
  {
    title: "Nouveau",
    description:
      "Mme Lambert signale depuis le portail que l'imprimante du service RH n'imprime plus. Le ticket INC-2087 est créé au statut Nouveau : personne ne s'en occupe encore.",
  },
  {
    title: "Qualifié et attribué",
    description:
      "Le N1 vérifie le type (incident), la catégorie (impression), l'impact et l'urgence, fixe la priorité P3 et attribue le ticket à un technicien ou à un groupe.",
  },
  {
    title: "En cours",
    description:
      "Le technicien traite le ticket. Chaque action est notée dans un suivi horodaté, pour qu'un collègue puisse reprendre le dossier sans rien redemander.",
  },
  {
    title: "En attente de l'utilisatrice ou d'un tiers",
    description:
      "Il manque une information : l'utilisatrice est en réunion jusqu'à 14 h, ou un fournisseur doit livrer une pièce. Selon la configuration, ce statut peut suspendre le décompte du SLA ; il ne sert jamais à arrêter le chrono sans raison.",
  },
  {
    title: "Retour en cours",
    description: "La réponse arrive : le ticket repasse en cours et le traitement reprend là où il s'était arrêté.",
  },
  {
    title: "Résolu",
    description:
      "La solution est appliquée et décrite dans le ticket. L'utilisatrice est prévenue et peut vérifier que tout fonctionne.",
  },
  {
    title: "Réouverture possible",
    description:
      "L'utilisatrice répond que le problème est revenu : le ticket est rouvert et repasse en cours. On ne crée pas de nouveau ticket, l'historique reste complet.",
  },
  {
    title: "Clos",
    description:
      "Après une nouvelle résolution, l'utilisatrice valide, ou le délai de validation prévu par l'organisation expire : le ticket est clos et ne peut plus être modifié.",
  },
];

type StateId = "new" | "qual" | "work" | "wait" | "solved" | "closed";

const NODES: Record<StateId, { x: number; y: number; w: number; label: string; sub?: string }> = {
  new: { x: 62, y: 80, w: 100, label: "Nouveau", sub: "créé" },
  qual: { x: 192, y: 80, w: 110, label: "Qualifié\net attribué" },
  work: { x: 330, y: 80, w: 100, label: "En cours", sub: "traitement" },
  wait: { x: 460, y: 80, w: 100, label: "En attente" },
  solved: { x: 330, y: 220, w: 100, label: "Résolu", sub: "solution notée" },
  closed: { x: 460, y: 220, w: 100, label: "Clos", sub: "définitif" },
};

const ACTIVE: StateId[] = ["new", "qual", "work", "wait", "work", "solved", "work", "closed"];
const STATUS = ["Nouveau", "Qualifié, attribué", "En cours", "En attente", "En cours", "Résolu", "En cours", "Clos"];

type Edge = { id: string; from: Pt; to: Pt; dashed?: boolean };
const EDGES: Edge[] = [
  { id: "new-qual", from: { x: 114, y: 80 }, to: { x: 135, y: 80 } },
  { id: "qual-work", from: { x: 249, y: 80 }, to: { x: 278, y: 80 } },
  { id: "work-wait", from: { x: 382, y: 72 }, to: { x: 408, y: 72 } },
  { id: "wait-work", from: { x: 408, y: 88 }, to: { x: 382, y: 88 } },
  { id: "work-solved", from: { x: 350, y: 106 }, to: { x: 350, y: 194 } },
  { id: "reopen", from: { x: 310, y: 194 }, to: { x: 310, y: 106 }, dashed: true },
  { id: "solved-closed", from: { x: 382, y: 220 }, to: { x: 408, y: 220 } },
];

/** Transitions parcourues à chaque étape. */
const USED: string[][] = [[], ["new-qual"], ["qual-work"], ["work-wait"], ["wait-work"], ["work-solved"], ["reopen"], ["work-solved", "solved-closed"]];

export default function TicketLifecycleDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const active = ACTIVE[step];
  const used = USED[step];
  return (
    <DiagramShell title="Cycle de vie d'un ticket, du statut Nouveau au statut Clos, avec attente et réouverture" steps={STEPS} state={s}>
      <svg viewBox="0 32 520 254" className="h-auto w-full" aria-hidden="true">
        {EDGES.map((e) => {
          const on = used.includes(e.id);
          const color = on ? "var(--signal)" : e.id === "reopen" ? "var(--warn)" : "var(--line-strong)";
          return <Arrow key={e.id} from={e.from} to={e.to} color={color} dashed={e.dashed} width={on ? 2 : 1.5} />;
        })}
        <Label x={302} y={154} anchor="end" color={step === 6 ? "var(--signal)" : "var(--warn)"}>
          Réouverture
        </Label>
        <Label x={358} y={154} anchor="start">
          Solution
        </Label>

        {(Object.keys(NODES) as StateId[]).map((id) => {
          const n = NODES[id];
          const done = id === "closed" && step === 7;
          return (
            <Box
              key={id}
              x={n.x}
              y={n.y}
              w={n.w}
              h={48}
              label={n.label}
              sub={n.sub}
              active={active === id && !done}
              wash={active === id}
              tone={done ? "ok" : "default"}
            />
          );
        })}
        <Label x={460} y={122}>
          utilisatrice
        </Label>
        <Label x={460} y={136}>
          ou tiers
        </Label>

        {/* Fiche du ticket */}
        <rect x={16} y={160} width={232} height={112} rx={10} fill="var(--mist)" />
        <text x={32} y={186} fontSize={13} fontWeight={600} fill="var(--ink)" fontFamily={MONO}>
          INC-2087
        </text>
        <Label x={32} y={205} anchor="start">
          Imprimante RH bloquée
        </Label>
        <Label x={32} y={230} anchor="start">
          Statut
        </Label>
        <Appear key={`st-${step}`} reduced={reduced} dx={-4} dy={0}>
          <text x={104} y={230} fontSize={13} fontWeight={600} fill={step === 7 ? "var(--ok)" : "var(--signal)"}>
            {STATUS[step]}
          </text>
        </Appear>
        <Label x={32} y={252} anchor="start">
          Priorité
        </Label>
        <text x={104} y={252} fontSize={13} fill={step === 0 ? "var(--muted)" : "var(--ink)"} fontFamily={step === 0 ? undefined : MONO}>
          {step === 0 ? "à définir" : "P3"}
        </text>

        {used.map((id, i) => {
          const e = EDGES.find((x) => x.id === id);
          return e ? <TravelDot key={`${step}-${id}`} path={[e.from, e.to]} reduced={reduced} delay={i * 0.8} duration={0.7} /> : null;
        })}
      </svg>
    </DiagramShell>
  );
}
