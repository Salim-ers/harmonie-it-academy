"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Appear, Arrow, Box, DiagramShell, Label, Token, type Pt } from "./shared";

const STEPS: DiagramStep[] = [
  {
    title: "N0 : l'utilisatrice cherche d'abord seule",
    description:
      "Au service paie, l'export PDF du logiciel de paie plante. Mme Roussel consulte le portail en self-service : aucun article ne correspond. Elle ouvre le ticket INC-2041 depuis le portail.",
  },
  {
    title: "N1 : le service desk prend le ticket",
    description:
      "Le technicien N1 qualifie le ticket, reproduit le plantage, relève la version du logiciel (4.2) et le message d'erreur. Aucun contournement connu : il prépare une escalade avec un dossier complet.",
  },
  {
    title: "Escalade vers le N2",
    description:
      "Le spécialiste applicatif N2 reproduit le problème sur un poste de test : il apparaît sur tous les postes en version 4.2. C'est un défaut du logiciel, il faut l'éditeur.",
  },
  {
    title: "Escalade vers le N3",
    description:
      "Le N2 ouvre un dossier chez l'éditeur (N3) avec les étapes de reproduction et les journaux. L'éditeur confirme le défaut et livre un correctif, la version 4.2.1.",
  },
  {
    title: "Retour au N2 : la solution redescend",
    description:
      "Le N2 teste le correctif, le déploie sur les postes du service paie et documente la procédure dans le ticket.",
  },
  {
    title: "Retour au N1 : confirmation et clôture",
    description:
      "Le N1 rappelle Mme Roussel, qui vérifie que l'export PDF fonctionne. Il note la solution et résout le ticket avec son accord.",
  },
  {
    title: "Retour au N0 : la connaissance est publiée",
    description:
      "Un article de base de connaissances est publié sur le portail. Le prochain utilisateur concerné trouvera la réponse seul, sans ticket : c'est l'intérêt du retour d'information.",
  },
];

const BANDS = [
  { id: "n3", label: "N3 : experts et éditeurs", sub: "correctifs, développement", y: 66 },
  { id: "n2", label: "N2 : spécialistes", sub: "réseau, systèmes, applications", y: 130 },
  { id: "n1", label: "N1 : service desk", sub: "premier contact, diagnostic, résolution", y: 194 },
  { id: "n0", label: "N0 : self-service", sub: "portail, base de connaissances", y: 258 },
] as const;

const Y = { n3: 66, n2: 130, n1: 194, n0: 258, user: 322 };
const UP_X = 50;
const DOWN_X = 470;

/** Niveau actif à chaque étape. */
const ACTIVE: (keyof typeof Y)[] = ["n0", "n1", "n2", "n3", "n2", "n1", "n0"];

function move(step: number): { path: Pt[]; label: string; tone: string } {
  switch (step) {
    case 0:
      return { path: [{ x: UP_X, y: Y.user }, { x: UP_X, y: Y.n0 }], label: "INC-2041", tone: "var(--signal)" };
    case 1:
      return { path: [{ x: UP_X, y: Y.n0 }, { x: UP_X, y: Y.n1 }], label: "INC-2041", tone: "var(--signal)" };
    case 2:
      return { path: [{ x: UP_X, y: Y.n1 }, { x: UP_X, y: Y.n2 }], label: "INC-2041", tone: "var(--signal)" };
    case 3:
      return { path: [{ x: UP_X, y: Y.n2 }, { x: UP_X, y: Y.n3 }], label: "INC-2041", tone: "var(--signal)" };
    case 4:
      return { path: [{ x: DOWN_X, y: Y.n3 }, { x: DOWN_X, y: Y.n2 }], label: "4.2.1", tone: "var(--ok)" };
    case 5:
      return { path: [{ x: DOWN_X, y: Y.n2 }, { x: DOWN_X, y: Y.n1 }], label: "Solution", tone: "var(--ok)" };
    default:
      return { path: [{ x: DOWN_X, y: Y.n1 }, { x: DOWN_X, y: Y.n0 }], label: "Article", tone: "var(--ok)" };
  }
}

export default function SupportLevelsDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const active = ACTIVE[step];
  const m = move(step);
  const goingUp = step <= 3;
  return (
    <DiagramShell title="Niveaux de support N0 à N3 : escalade d'un ticket puis retour de la solution" steps={STEPS} state={s}>
      <svg viewBox="0 0 520 372" className="h-auto w-full" aria-hidden="true">
        {/* Couloirs d'escalade et de retour */}
        <Label x={UP_X} y={20} weight={600} color={goingUp ? "var(--signal)" : "var(--muted)"}>
          Escalade
        </Label>
        <Arrow from={{ x: UP_X, y: 296 }} to={{ x: UP_X, y: 32 }} color={goingUp ? "var(--signal)" : "var(--line-strong)"} dashed />
        <Label x={DOWN_X} y={14} weight={600} color={!goingUp ? "var(--ok)" : "var(--muted)"}>
          Retour
        </Label>
        <Label x={DOWN_X} y={28} weight={600} color={!goingUp ? "var(--ok)" : "var(--muted)"}>
          d&apos;information
        </Label>
        <Arrow from={{ x: DOWN_X, y: 38 }} to={{ x: DOWN_X, y: 290 }} color={!goingUp ? "var(--ok)" : "var(--line-strong)"} dashed />

        {BANDS.map((b) => (
          <Box
            key={b.id}
            x={260}
            y={b.y}
            w={300}
            h={50}
            label={b.label}
            sub={b.sub}
            active={active === b.id && step !== 6}
            wash={active === b.id}
            tone={step === 6 && b.id === "n0" ? "ok" : "default"}
          />
        ))}
        <Box x={260} y={Y.user} w={220} h={40} label="Utilisatrice, service paie" tone="muted" labelSize={13} />
        <Arrow from={{ x: 150, y: Y.user }} to={{ x: 82, y: Y.user }} color="var(--line-strong)" />

        {/* Coût croissant de l'expertise */}
        <Label x={260} y={364} size={12}>
          Plus on monte, plus l&apos;expertise est rare et coûteuse
        </Label>

        {step === 6 ? (
          <Appear key="kb" reduced={reduced} delay={reduced ? 0 : 1.1}>
            <rect x={380} y={300} width={76} height={22} rx={11} fill="var(--ok-wash)" stroke="var(--ok)" />
            <text x={418} y={315} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ok)" fontFamily="var(--font-mono)">
              KB-118
            </text>
          </Appear>
        ) : null}

        <Token key={`t-${step}`} path={m.path} label={m.label} reduced={reduced} color={m.tone} mono w={80} />
      </svg>
    </DiagramShell>
  );
}
