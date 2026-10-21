"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { ChoiceGroup, DiagramShell, Facts, InfoPanel, Label, Token } from "./shared";

type Level = 0 | 1 | 2;
const IMPACTS = [
  { label: "Élevé", sub: "site, service entier" },
  { label: "Moyen", sub: "une équipe" },
  { label: "Faible", sub: "une personne" },
] as const;
const URGENCIES = ["Haute", "Moyenne", "Basse"] as const;

/** Priorité selon la matrice fictive du Groupe Valmont : P = impact + urgence + 1 (indices 0 = le plus fort). */
const NAMES = ["Critique", "Haute", "Moyenne", "Basse", "Planifiée"] as const;
function priority(impact: Level, urgency: Level) {
  return impact + urgency + 1;
}

type TicketId = "a" | "b" | "c" | "d" | "e";
const TICKETS: Record<TicketId, { short: string; text: string; impact: Level; urgency: Level; impactWhy: string; urgencyWhy: string }> = {
  a: {
    short: "Entrepôt sans réseau",
    text: "L'entrepôt n'a plus de réseau : les étiquettes de colis ne s'impriment plus, les camions attendent.",
    impact: 0,
    impactWhy: "tout un site est arrêté",
    urgency: 0,
    urgencyWhy: "les expéditions sont bloquées maintenant",
  },
  b: {
    short: "Paie sans impression",
    text: "Plus rien ne s'imprime au service paie ; les bulletins doivent partir à 11 h.",
    impact: 1,
    impactWhy: "une équipe de six personnes",
    urgency: 0,
    urgencyWhy: "échéance ce matin, aucun contournement",
  },
  c: {
    short: "Scanner des achats",
    text: "Le scanner de l'équipe achats ne numérise plus ; un autre scanner fonctionne à l'étage.",
    impact: 1,
    impactWhy: "toute l'équipe achats est concernée",
    urgency: 1,
    urgencyWhy: "gênant, mais un contournement existe",
  },
  d: {
    short: "Excel qui plante",
    text: "Excel se ferme à l'ouverture d'un classeur précis ; la comptable peut travailler sur ses autres fichiers.",
    impact: 2,
    impactWhy: "une seule personne",
    urgency: 1,
    urgencyWhy: "gênant, le reste de son travail avance",
  },
  e: {
    short: "Deuxième écran",
    text: "Un collaborateur demande un deuxième écran pour son poste.",
    impact: 2,
    impactWhy: "une seule personne",
    urgency: 2,
    urgencyWhy: "confort, rien n'est bloqué",
  },
};
const ORDER: TicketId[] = ["a", "b", "c", "d", "e"];

const X0 = 150;
const CW = 118;
const Y0 = 58;
const CH = 78;
const cellX = (u: number) => X0 + u * CW + CW / 2;
const cellY = (i: number) => Y0 + i * CH;

const FILL = ["var(--danger-wash)", "var(--warn-wash)", "var(--mist)", "var(--surface)", "var(--surface)"];

export default function PriorityMatrixDiagram() {
  const reduced = Boolean(useReducedMotion());
  const [placed, setPlaced] = useState<TicketId[]>([]);
  const [selected, setSelected] = useState<TicketId | null>(null);
  const [run, setRun] = useState(0);

  const choose = (id: TicketId) => {
    setPlaced((p) => (p.includes(id) ? p : [...p, id]));
    setSelected(id);
    setRun((r) => r + 1);
  };

  const t = selected ? TICKETS[selected] : null;
  const p = t ? priority(t.impact, t.urgency) : null;

  return (
    <DiagramShell
      title="Matrice de priorité : l'impact en lignes, l'urgence en colonnes, la priorité de P1 à P5 à l'intersection"
      controls={
        <div>
          <ChoiceGroup
            label="Placez un ticket dans la matrice"
            options={ORDER.map((id) => ({ id, label: `${id.toUpperCase()}. ${TICKETS[id].short}` }))}
            value={selected}
            onChange={choose}
          />
          <InfoPanel title={t && p ? `Ticket ${selected?.toUpperCase()} : priorité P${p}, ${NAMES[p - 1].toLowerCase()}` : "Comment lire la matrice"}>
            {t && p ? (
              <>
                <p>{t.text}</p>
                <Facts
                  items={[
                    { term: "Impact", value: `${IMPACTS[t.impact].label} : ${t.impactWhy}` },
                    { term: "Urgence", value: `${URGENCIES[t.urgency]} : ${t.urgencyWhy}` },
                    { term: "Priorité", value: `P${p}, ${NAMES[p - 1]}` },
                  ]}
                />
              </>
            ) : (
              <p>
                Choisissez un ticket : il se place à l&apos;intersection de son impact (qui est touché) et de son urgence (à quel point c&apos;est
                pressé). La priorité se lit dans la case, elle ne se choisit pas au ressenti. Chaque organisation fixe ses propres seuils.
              </p>
            )}
          </InfoPanel>
          {placed.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setPlaced([]);
                setSelected(null);
              }}
              className="mt-2 h-8 rounded-[var(--radius-control)] px-2 text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Vider la matrice
            </button>
          ) : null}
        </div>
      }
    >
      <svg viewBox="0 0 520 300" className="h-auto w-full" aria-hidden="true">
        <Label x={X0 + (3 * CW) / 2} y={18} weight={600} color="var(--ink-2)" size={13}>
          Urgence
        </Label>
        <Label x={20} y={44} anchor="start" weight={600} color="var(--ink-2)" size={13}>
          Impact
        </Label>
        {URGENCIES.map((u, i) => (
          <Label key={u} x={cellX(i)} y={44} size={13} color={t && t.urgency === i ? "var(--signal)" : "var(--muted)"} weight={t && t.urgency === i ? 600 : undefined}>
            {u}
          </Label>
        ))}
        {IMPACTS.map((imp, i) => (
          <g key={imp.label}>
            <text x={20} y={cellY(i) + CH / 2 - 2} fontSize={13} fontWeight={600} fill={t && t.impact === i ? "var(--signal)" : "var(--ink)"}>
              {imp.label}
            </text>
            <text x={20} y={cellY(i) + CH / 2 + 15} fontSize={12} fill="var(--muted)">
              {imp.sub}
            </text>
          </g>
        ))}

        {[0, 1, 2].map((i) =>
          [0, 1, 2].map((u) => {
            const pr = priority(i as Level, u as Level);
            const on = t !== null && t.impact === i && t.urgency === u;
            return (
              <g key={`${i}-${u}`}>
                <rect
                  x={X0 + u * CW + 2}
                  y={cellY(i) + 2}
                  width={CW - 4}
                  height={CH - 4}
                  rx={8}
                  fill={FILL[pr - 1]}
                  stroke={on ? "var(--signal)" : "var(--line-strong)"}
                  strokeWidth={on ? 2 : 1}
                />
                <text x={cellX(u)} y={cellY(i) + 28} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--ink)" fontFamily="var(--font-mono)">
                  P{pr}
                </text>
                <text x={cellX(u)} y={cellY(i) + 45} textAnchor="middle" fontSize={12} fill="var(--muted)">
                  {NAMES[pr - 1]}
                </text>
              </g>
            );
          }),
        )}

        {placed
          .filter((id) => id !== selected)
          .map((id) => {
            const tk = TICKETS[id];
            return (
              <g key={id} transform={`translate(${cellX(tk.urgency)} ${cellY(tk.impact) + 61})`}>
                <rect x={-14} y={-10} width={28} height={20} rx={10} fill="var(--ink-2)" />
                <text x={0} y={4} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--paper)">
                  {id.toUpperCase()}
                </text>
              </g>
            );
          })}
        {selected && t ? (
          <Token
            key={`${selected}-${run}`}
            path={[
              { x: 260, y: 300 },
              { x: cellX(t.urgency), y: cellY(t.impact) + 61 },
            ]}
            label={selected.toUpperCase()}
            reduced={reduced}
            w={28}
            h={20}
            duration={0.8}
          />
        ) : null}
      </svg>
    </DiagramShell>
  );
}
