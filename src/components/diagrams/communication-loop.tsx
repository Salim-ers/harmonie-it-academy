"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Arrow, Box, DiagramShell, Label, TravelDot, edge, type Pt } from "./shared";

type LoopStep = DiagramStep & { phrase: string; node: number; back?: boolean };

const STEPS: LoopStep[] = [
  {
    title: "Accueillir",
    description: "Se présenter, montrer qu'on écoute, laisser la personne exposer son problème sans l'interrompre.",
    phrase: "« Bonjour, support informatique, Léa à l'appareil. Je vous écoute. »",
    node: 0,
  },
  {
    title: "Questionner",
    description:
      "Commencer par des questions ouvertes pour comprendre, puis des questions fermées (oui ou non) pour préciser un détail.",
    phrase:
      "Ouverte : « Que se passe-t-il exactement quand vous lancez l'impression ? » Fermée : « Le problème a-t-il commencé ce matin ? »",
    node: 1,
  },
  {
    title: "Reformuler",
    description: "Résumer avec ses propres mots et faire valider : l'utilisateur sait qu'il a été compris, et l'on évite de résoudre le mauvais problème.",
    phrase:
      "« Si je résume : depuis ce matin, vos impressions restent bloquées, alors que vos collègues impriment normalement. C'est bien ça ? »",
    node: 2,
  },
  {
    title: "Agir et expliquer",
    description: "Annoncer ce que l'on va faire, en mots simples, avant de le faire, surtout en prise de main à distance.",
    phrase:
      "« Je vais supprimer le document bloqué dans la file d'attente. Vous allez le voir disparaître de la liste, puis vous pourrez relancer l'impression. »",
    node: 3,
  },
  {
    title: "Confirmer la résolution",
    description: "C'est l'utilisateur qui confirme que c'est réglé, en refaisant le geste qui posait problème.",
    phrase: "« Pouvez-vous relancer l'impression et me dire si la page sort ? »",
    node: 4,
  },
  {
    title: "Pas encore réglé : la boucle repart",
    description: "Si la confirmation échoue, on ne conclut pas : on revient aux questions avec ce que l'on vient d'apprendre.",
    phrase: "« D'accord, la page ne sort toujours pas. Que voyez-vous maintenant dans la file d'attente ? »",
    node: 4,
    back: true,
  },
  {
    title: "Documenter",
    description:
      "Une fois la résolution confirmée, noter dans le ticket le symptôme, la cause, l'action et la confirmation, pour l'équipe et pour la base de connaissances.",
    phrase:
      "Dans le ticket : « Travail en erreur en tête de file IMP-2E-RH, supprimé. Impression relancée, confirmée par l'utilisatrice à 10 h 12. »",
    node: 5,
  },
];

const NODES: { label: string; sub: string }[] = [
  { label: "Accueillir", sub: "se présenter, écouter" },
  { label: "Questionner", sub: "ouvertes, fermées" },
  { label: "Reformuler", sub: "vérifier le besoin" },
  { label: "Agir et expliquer", sub: "annoncer chaque geste" },
  { label: "Confirmer", sub: "avec l'utilisateur" },
  { label: "Documenter", sub: "dans le ticket" },
];

const C = { x: 260, y: 164 };
const RX = 178;
const RY = 112;
const W = 150;
const H = 46;
const POS: Pt[] = NODES.map((_, i) => {
  const a = ((-90 + i * 60) * Math.PI) / 180;
  return { x: Math.round(C.x + RX * Math.cos(a)), y: Math.round(C.y + RY * Math.sin(a)) };
});

function link(a: number, b: number): [Pt, Pt] {
  return [edge(POS[a], W, H, POS[b], 3), edge(POS[b], W, H, POS[a], 3)];
}

export default function CommunicationLoopDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const cur = STEPS[step];
  const back = link(4, 1);
  const incoming: [Pt, Pt] | null = cur.back ? back : step === 0 ? null : step === 6 ? link(4, 5) : link(cur.node - 1, cur.node);
  return (
    <DiagramShell
      title="Boucle de communication avec l'utilisateur : accueillir, questionner, reformuler, agir et expliquer, confirmer, documenter"
      steps={STEPS}
      state={s}
      stepExtra={<p className="rounded-[var(--radius-control)] border-l-2 border-signal bg-mist px-3 py-2 text-ink-2">{cur.phrase}</p>}
    >
      <svg viewBox="0 0 520 320" className="h-auto w-full" aria-hidden="true">
        {NODES.map((_, i) => {
          const [a, b] = link(i, (i + 1) % NODES.length);
          const on = incoming !== null && !cur.back && step !== 0 && cur.node === (i + 1) % NODES.length;
          return <Arrow key={i} from={a} to={b} color={on ? "var(--signal)" : "var(--line-strong)"} width={on ? 2 : 1.5} />;
        })}
        <Arrow from={back[0]} to={back[1]} dashed color={cur.back ? "var(--signal)" : "var(--warn)"} width={cur.back ? 2 : 1.5} />
        <Label x={C.x} y={C.y + 52} color={cur.back ? "var(--signal)" : "var(--warn)"}>
          pas réglé : on reprend
        </Label>

        {NODES.map((n, i) => (
          <Box
            key={n.label}
            x={POS[i].x}
            y={POS[i].y}
            w={W}
            h={H}
            label={n.label}
            sub={n.sub}
            active={cur.node === i}
            wash={cur.node === i}
            tone={step === 6 && i === 4 ? "ok" : "default"}
          />
        ))}
        {incoming ? <TravelDot key={`d-${step}`} path={incoming} reduced={reduced} duration={0.8} /> : null}
      </svg>
    </DiagramShell>
  );
}
