"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Appear, Arrow, Box, DiagramShell, Label, MONO, Mark } from "./shared";

const STEPS: DiagramStep[] = [
  {
    title: "1. Symptôme",
    description:
      "Décrire précisément ce que l'on constate, pas ce que l'on suppose : depuis 9 h, le poste du bureau des expéditions affiche « accès refusé » sur le dossier partagé des bons de livraison.",
  },
  {
    title: "2. Impact",
    description:
      "Qui est touché, depuis quand, avec quelle gêne ? Un seul poste du bureau des expéditions ; les autres postes ouvrent le dossier. Les bons de livraison ne peuvent pas être imprimés depuis ce poste.",
  },
  {
    title: "3. Hypothèses",
    description:
      "Lister plusieurs causes possibles avant de toucher à quoi que ce soit, et demander ce qui a changé : le mot de passe du compte de l'entrepôt a été modifié ce matin.",
  },
  {
    title: "4. Premier test, le plus simple",
    description:
      "On commence par le test le moins coûteux : ping fic01 répond. Le réseau fonctionne, l'hypothèse « réseau coupé » est écartée.",
  },
  {
    title: "Test négatif : retour aux hypothèses",
    description:
      "Le test a invalidé l'hypothèse : on revient à la liste et on passe à la suivante, sans rien modifier sur le poste. Un seul changement à la fois, et seulement quand la cause est trouvée.",
  },
  {
    title: "Deuxième test",
    description:
      "Le Gestionnaire d'identification de Windows contient un identifiant enregistré pour fic01 avec l'ancien mot de passe. L'hypothèse est confirmée ; le test des droits, plus long, devient inutile.",
  },
  {
    title: "5. Correction",
    description: "Supprimer l'identifiant périmé, puis se reconnecter au partage avec le nouveau mot de passe. Une seule modification, ciblée.",
  },
  {
    title: "6. Validation et documentation",
    description:
      "L'utilisateur ouvre le dossier et imprime un bon de livraison : c'est lui qui valide. Le ticket décrit symptôme, tests, cause et correction ; la note peut devenir un article de base de connaissances.",
  },
];

const METHOD = [
  { label: "1. Symptôme", sub: "ce que l'on constate" },
  { label: "2. Impact", sub: "qui, depuis quand" },
  { label: "3. Hypothèses", sub: "les causes possibles" },
  { label: "4. Tests", sub: "le plus simple d'abord" },
  { label: "5. Correction", sub: "un seul changement" },
  { label: "6. Validation", sub: "et documentation" },
];
const ACTIVE = [0, 1, 2, 3, 2, 3, 4, 5];
const BX = 96;
const BW = 176;
const by = (i: number) => 30 + i * 56;

type MarkKind = "pending" | "current" | "ok" | "fail" | "skip";

function hypMarks(step: number): MarkKind[] {
  return [
    step >= 3 ? "fail" : step === 2 ? "current" : "pending",
    step >= 5 ? "ok" : step === 4 ? "current" : "pending",
    step >= 5 ? "skip" : "pending",
  ];
}
function testMarks(step: number): MarkKind[] {
  return [step >= 3 ? "ok" : "pending", step >= 5 ? "ok" : step === 4 ? "current" : "pending", step >= 5 ? "skip" : "pending"];
}

const PX = 236;
const PW = 274;

export default function DiagnosticMethodDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const active = ACTIVE[step];
  const hyps = hypMarks(step);
  const tests = testMarks(step);
  const loopOn = step === 4;
  const done = step === 7;

  const card = (y: number, h: number, title: string, on: boolean, tone?: "ok") => (
    <g>
      <rect
        x={PX}
        y={y}
        width={PW}
        height={h}
        rx={10}
        fill="var(--surface)"
        stroke={tone === "ok" ? "var(--ok)" : on ? "var(--signal)" : "var(--line-strong)"}
        strokeWidth={on || tone ? 1.75 : 1.25}
      />
      <Label x={PX + 14} y={y + 19} anchor="start" weight={600} color="var(--ink-2)">
        {title}
      </Label>
    </g>
  );

  return (
    <DiagramShell title="Méthode de diagnostic en six étapes, avec retour aux hypothèses quand un test les invalide" steps={STEPS} state={s}>
      <svg viewBox="0 0 520 344" className="h-auto w-full" aria-hidden="true">
        {METHOD.map((m, i) =>
          i < METHOD.length - 1 ? (
            <Arrow key={`a${i}`} from={{ x: BX, y: by(i) + 23 }} to={{ x: BX, y: by(i + 1) - 23 }} color={active === i + 1 && !loopOn ? "var(--signal)" : "var(--line-strong)"} />
          ) : null,
        )}
        {/* Boucle : un test négatif renvoie aux hypothèses */}
        <path
          d={`M${BX + BW / 2 + 2} ${by(3)} H${BX + BW / 2 + 20} V${by(2)} H${BX + BW / 2 + 9}`}
          fill="none"
          stroke={loopOn ? "var(--signal)" : "var(--warn)"}
          strokeWidth={loopOn ? 2 : 1.5}
          strokeDasharray="4 3"
        />
        <polygon
          points={`${BX + BW / 2 + 3},${by(2)} ${BX + BW / 2 + 10},${by(2) - 4} ${BX + BW / 2 + 10},${by(2) + 4}`}
          fill={loopOn ? "var(--signal)" : "var(--warn)"}
        />
        <Label x={BX + BW / 2 + 25} y={by(2) + 32} anchor="start" color={loopOn ? "var(--signal)" : "var(--warn)"}>
          non
        </Label>

        {METHOD.map((m, i) => (
          <Box key={m.label} x={BX} y={by(i)} w={BW} h={42} label={m.label} sub={m.sub} active={active === i && !done} wash={active === i} tone={done && i === 5 ? "ok" : "default"} />
        ))}

        {/* Constat */}
        {card(10, 96, "Constat", active <= 1 || active >= 4, done ? "ok" : undefined)}
        {[
          { k: "Symptôme", v: "accès refusé au partage", show: true },
          { k: "Impact", v: "un poste, expéditions", show: step >= 1 },
          { k: "Correction", v: "identifiant mis à jour", show: step >= 6 },
        ].map((r, i) => (
          <g key={r.k} opacity={r.show ? 1 : 0.35}>
            <Label x={PX + 14} y={52 + i * 22} anchor="start">
              {r.k}
            </Label>
            {r.show ? (
              <Appear key={`${r.k}-${r.show}`} reduced={reduced} dx={-4} dy={0}>
                <text x={PX + 92} y={52 + i * 22} fontSize={12} fill={i === 2 && done ? "var(--ok)" : "var(--ink)"}>
                  {r.v}
                </text>
              </Appear>
            ) : null}
          </g>
        ))}

        {/* Hypothèses */}
        {card(116, 106, "Hypothèses", active === 2)}
        {["Réseau coupé", "Mot de passe mémorisé périmé", "Droits retirés sur le partage"].map((h, i) => (
          <g key={h} opacity={step >= 2 ? 1 : 0.35}>
            <Mark x={PX + 21} y={156 + i * 24} kind={hyps[i]} />
            <text
              x={PX + 36}
              y={160 + i * 24}
              fontSize={12}
              fill={hyps[i] === "fail" || hyps[i] === "skip" ? "var(--muted)" : "var(--ink)"}
              textDecoration={hyps[i] === "fail" ? "line-through" : undefined}
            >
              {`H${i + 1}  ${h}`}
            </text>
          </g>
        ))}

        {/* Tests */}
        {card(232, 106, "Tests, du plus simple au plus coûteux", active === 3)}
        {[
          { t: "ping fic01", mono: true, cost: "1 min" },
          { t: "Gestionnaire d'identification", mono: false, cost: "2 min" },
          { t: "Vérifier les droits (N2)", mono: false, cost: "30 min" },
        ].map((r, i) => (
          <g key={r.t} opacity={step >= 2 ? 1 : 0.35}>
            <Mark x={PX + 21} y={272 + i * 24} kind={tests[i]} />
            <text x={PX + 36} y={276 + i * 24} fontSize={12} fill={tests[i] === "skip" ? "var(--muted)" : "var(--ink)"} fontFamily={r.mono ? MONO : undefined}>
              {r.t}
            </text>
            <Label x={PX + PW - 12} y={276 + i * 24} anchor="end" mono>
              {r.cost}
            </Label>
          </g>
        ))}
      </svg>
    </DiagramShell>
  );
}
