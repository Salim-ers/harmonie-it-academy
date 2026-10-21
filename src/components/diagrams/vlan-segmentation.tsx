"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChoiceGroup, DiagramShell, Facts, InfoPanel, Label, MONO } from "./shared";

type Vlan = 10 | 20 | 30;
const VLANS: Record<Vlan, { name: string; subnet: string; gateway: string; dhcp: string }> = {
  10: { name: "Bureaux", subnet: "10.20.10.0/24", gateway: "10.20.10.1", dhcp: "étendue Bureaux, de 10.20.10.50 à 10.20.10.240" },
  20: { name: "Téléphonie", subnet: "10.20.20.0/24", gateway: "10.20.20.1", dhcp: "étendue Téléphonie, avec les options des téléphones" },
  30: { name: "Imprimantes", subnet: "10.20.30.0/24", gateway: "10.20.30.1", dhcp: "étendue Imprimantes, surtout des réservations" },
};

type PortId = "p1" | "p2" | "p3" | "p4" | "p5";
const PORTS: Record<PortId, { n: number; jack: string; vlan: Vlan; device: string; kind: string; address: string; expected?: Vlan; note: string }> = {
  p1: { n: 1, jack: "3.12-A", vlan: 10, device: "PC-CPT-012", kind: "PC", address: "10.20.10.143", note: "Bon VLAN : le poste arrive sur le réseau des bureaux et joint tous ses services." },
  p2: {
    n: 2,
    jack: "3.12-B",
    vlan: 30,
    device: "PC-CPT-009",
    kind: "PC",
    address: "10.20.30.117",
    expected: 10,
    note: "Mauvaise prise : ce port est en VLAN 30. Le PC reçoit une adresse du réseau Imprimantes, peut imprimer mais n'atteint pas le reste, bloqué par le filtrage. Le poste n'y est pour rien : on note la prise, l'adresse obtenue et le VLAN attendu, et on escalade au N2 réseau. Pour vérifier, le même PC sur la prise 3.12-A obtient une adresse en 10.20.10.x.",
  },
  p3: { n: 3, jack: "3.13-A", vlan: 10, device: "PC-CPT-015", kind: "PC", address: "10.20.10.151", note: "Bon VLAN : même réseau que PC-CPT-012, ils communiquent directement sans passer par le routeur." },
  p4: { n: 4, jack: "3.13-B", vlan: 20, device: "Téléphone IP", kind: "téléphone", address: "10.20.20.37", note: "Le téléphone est dans son propre VLAN : la voix est isolée et peut être priorisée." },
  p5: { n: 5, jack: "3.14-A", vlan: 30, device: "IMP-3E-CPT", kind: "imprimante", address: "10.20.30.51", note: "L'imprimante reçoit toujours la même adresse grâce à une réservation DHCP. Les PC des bureaux la joignent en passant par le routeur." },
};
const ORDER: PortId[] = ["p1", "p2", "p3", "p4", "p5"];

const PX = (n: number) => 72 + (n - 1) * 94;
const SVI_X: Record<Vlan, number> = { 10: 112, 20: 260, 30: 408 };

export default function VlanSegmentationDiagram() {
  const reduced = Boolean(useReducedMotion());
  const [sel, setSel] = useState<PortId | null>(null);
  const port = sel ? PORTS[sel] : null;
  const v = port ? VLANS[port.vlan] : null;
  const wrong = port?.expected !== undefined;

  return (
    <DiagramShell
      title="Switch d'étage avec ports d'accès en VLAN 10, 20 et 30 et un trunk 802.1Q vers le cœur de réseau"
      controls={
        <div>
          <ChoiceGroup
            label="Choisissez un port du switch"
            options={ORDER.map((id) => ({ id, label: `Gi1/0/${PORTS[id].n}, prise ${PORTS[id].jack}` }))}
            value={sel}
            onChange={setSel}
          />
          <InfoPanel
            title={
              port && v
                ? `Gi1/0/${port.n} : port d'accès en VLAN ${port.vlan} (${v.name})${wrong ? ", mauvaise prise pour un PC de bureau" : ""}`
                : "Ports d'accès et trunk"
            }
          >
            {port && v ? (
              <>
                <Facts
                  items={[
                    { term: "Appareil", value: `${port.device} (${port.kind})` },
                    { term: "Réseau", value: v.subnet, mono: true },
                    { term: "Passerelle", value: v.gateway, mono: true },
                    { term: "DHCP", value: v.dhcp },
                    { term: "Adresse obtenue", value: port.address, mono: true },
                  ]}
                />
                <p>{port.note}</p>
              </>
            ) : (
              <p>
                Chaque port d&apos;accès appartient à un seul VLAN : l&apos;appareil branché arrive dans le réseau, la passerelle et l&apos;étendue DHCP
                de ce VLAN, sans rien configurer. Le port trunk Gi1/0/48 transporte tous les VLAN vers le cœur de réseau : chaque trame y porte une
                étiquette 802.1Q de 4 octets avec son numéro de VLAN (sauf le VLAN natif). Le cœur route d&apos;un VLAN à l&apos;autre.
              </p>
            )}
          </InfoPanel>
        </div>
      }
    >
      <svg viewBox="0 0 520 300" className="h-auto w-full" aria-hidden="true">
        {/* Cœur de réseau */}
        <rect x={20} y={10} width={480} height={84} rx={10} fill="var(--surface)" stroke="var(--line-strong)" />
        <Label x={36} y={30} anchor="start" weight={600} color="var(--ink-2)" size={13}>
          Cœur de réseau, routage entre VLAN
        </Label>
        {([10, 20, 30] as Vlan[]).map((id) => {
          const on = port?.vlan === id;
          return (
            <g key={id}>
              <rect
                x={SVI_X[id] - 72}
                y={42}
                width={144}
                height={42}
                rx={8}
                fill={on ? (wrong ? "var(--danger-wash)" : "var(--signal-wash)") : "var(--mist)"}
                stroke={on ? (wrong ? "var(--danger)" : "var(--signal)") : "var(--line)"}
                strokeWidth={on ? 2 : 1}
              />
              <text x={SVI_X[id]} y={59} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">
                {`VLAN ${id} ${VLANS[id].name}`}
              </text>
              <text x={SVI_X[id]} y={76} textAnchor="middle" fontSize={12} fill="var(--muted)" fontFamily={MONO}>
                {VLANS[id].gateway}
              </text>
            </g>
          );
        })}

        {/* Trunk */}
        <line x1={260} y1={94} x2={260} y2={146} stroke="var(--ink-2)" strokeWidth={3} />
        <Label x={272} y={114} anchor="start" weight={600} color="var(--ink-2)">
          Trunk 802.1Q, Gi1/0/48
        </Label>
        <Label x={272} y={130} anchor="start">
          VLAN 10, 20 et 30 étiquetés
        </Label>
        {([10, 20, 30] as Vlan[]).map((id, i) => {
          const on = port?.vlan === id;
          return (
            <motion.g
              key={`tag-${id}-${sel ?? "none"}`}
              initial={reduced ? false : { y: 150, opacity: 0 }}
              animate={{ y: 106 + i * 15, opacity: 1 }}
              transition={reduced ? { duration: 0 } : { duration: 0.9, delay: i * 0.2, ease: "easeOut" }}
            >
              <rect x={214} y={-8} width={32} height={16} rx={8} fill={on ? "var(--signal)" : "var(--surface)"} stroke={on ? "var(--signal)" : "var(--line-strong)"} />
              <text x={230} y={4} textAnchor="middle" fontSize={12} fontWeight={600} fontFamily={MONO} fill={on ? "var(--paper)" : "var(--ink-2)"}>
                {id}
              </text>
            </motion.g>
          );
        })}

        {/* Switch d'étage */}
        <rect x={20} y={146} width={480} height={64} rx={10} fill="var(--mist)" stroke="var(--line-strong)" />
        <Label x={36} y={126} anchor="start">
          Switch d&apos;étage SW-SIEGE-ET3
        </Label>
        {ORDER.map((id) => {
          const p = PORTS[id];
          const on = sel === id;
          const bad = on && p.expected !== undefined;
          const x = PX(p.n);
          return (
            <g key={id}>
              <rect x={x - 16} y={156} width={32} height={24} rx={4} fill={on ? (bad ? "var(--danger)" : "var(--signal)") : "var(--surface)"} stroke={on ? (bad ? "var(--danger)" : "var(--signal)") : "var(--line-strong)"} />
              <text x={x} y={172} textAnchor="middle" fontSize={12} fontWeight={600} fontFamily={MONO} fill={on ? "var(--paper)" : "var(--ink)"}>
                {p.n}
              </text>
              <text x={x} y={198} textAnchor="middle" fontSize={12} fill={on ? (bad ? "var(--danger)" : "var(--signal)") : "var(--muted)"} fontWeight={on ? 600 : undefined}>
                {`VLAN ${p.vlan}`}
              </text>
              <line x1={x} y1={210} x2={x} y2={236} stroke={on ? (bad ? "var(--danger)" : "var(--signal)") : "var(--line-strong)"} strokeWidth={on ? 2 : 1.25} />
              <rect
                x={x - 44}
                y={236}
                width={88}
                height={52}
                rx={9}
                fill={bad ? "var(--danger-wash)" : on ? "var(--signal-wash)" : "var(--surface)"}
                stroke={bad ? "var(--danger)" : on ? "var(--signal)" : "var(--line-strong)"}
                strokeWidth={on ? 2 : 1.25}
              />
              <text x={x} y={256} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily={p.kind === "téléphone" ? undefined : MONO}>
                {p.device}
              </text>
              <text x={x} y={274} textAnchor="middle" fontSize={12} fill={bad ? "var(--danger)" : "var(--muted)"} fontFamily={on ? MONO : undefined}>
                {on ? p.address : `prise ${p.jack}`}
              </text>
            </g>
          );
        })}
      </svg>
    </DiagramShell>
  );
}
