"use client";

import { motion } from "motion/react";
import { DiagramFrame, Node, useSteps, type DiagramStep } from "./frame";

const STEPS: DiagramStep[] = [
  { title: "Le poste démarre sans adresse", description: "Sa carte réseau est active mais il ne connaît ni son adresse, ni la passerelle, ni le DNS." },
  { title: "Discover (diffusion)", description: "Le poste envoie à tout le réseau local : « Un serveur DHCP peut-il me répondre ? » Source 0.0.0.0, destination 255.255.255.255." },
  { title: "Offer", description: "Le serveur propose 10.20.10.87, masque /24, passerelle 10.20.10.1, DNS 10.20.1.10, bail de 8 jours." },
  { title: "Request (diffusion)", description: "Le poste accepte l'offre. Il la diffuse pour que d'éventuels autres serveurs DHCP sachent que leur offre est refusée." },
  { title: "Acknowledge", description: "Le serveur confirme et enregistre le bail. Le poste configure sa carte : il est opérationnel." },
];

const PC = { x: 72, y: 150 };
const SW = { x: 262, y: 150 };
const SRV = { x: 446, y: 150 };
const NB = { x: 262, y: 58 };

function Packet({ from, to, label, tone, broadcast }: { from: { x: number; y: number }; to: { x: number; y: number }; label: string; tone: string; broadcast?: boolean }) {
  return (
    <g>
      <motion.g
        initial={{ x: from.x, y: from.y - 34, opacity: 0 }}
        animate={{ x: [from.x, SW.x, to.x], y: from.y - 34, opacity: [0, 1, 1] }}
        transition={{ duration: 1.6, ease: "easeInOut", times: [0, 0.5, 1] }}
      >
        <rect x={-38} y={-12} width={76} height={24} rx={12} fill={tone} />
        <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--paper)">
          {label}
        </text>
      </motion.g>
      {broadcast ? (
        <motion.circle
          cx={SW.x}
          cy={SW.y}
          r={30}
          fill="none"
          stroke={tone}
          strokeWidth={1.5}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 2.2], opacity: [0.7, 0] }}
          transition={{ duration: 1.2, delay: 0.7, repeat: 1 }}
          style={{ transformOrigin: `${SW.x}px ${SW.y}px` }}
        />
      ) : null}
    </g>
  );
}

export default function DhcpDoraDiagram() {
  const s = useSteps(STEPS.length);
  const { step } = s;
  const configured = step >= 4;
  return (
    <DiagramFrame title="Échange DHCP DORA entre un poste, un switch et un serveur DHCP" steps={STEPS} state={s}>
      <svg viewBox="0 0 520 236" className="h-auto w-full" aria-hidden="true">
        <line x1={PC.x + 56} y1={PC.y} x2={SW.x - 56} y2={SW.y} stroke="var(--line-strong)" strokeWidth={2} />
        <line x1={SW.x + 56} y1={SW.y} x2={SRV.x - 62} y2={SRV.y} stroke="var(--line-strong)" strokeWidth={2} />
        <line x1={SW.x} y1={SW.y - 26} x2={NB.x} y2={NB.y + 22} stroke="var(--line)" strokeWidth={1.5} strokeDasharray="4 4" />
        <Node x={NB.x} y={NB.y} w={120} h={42} label="Poste voisin" sub="10.20.10.64" tone="muted" />
        <Node x={PC.x} y={PC.y} label="PC-CPT-014" sub={configured ? "10.20.10.87" : "0.0.0.0"} tone={configured ? "ok" : "default"} active={step > 0 && step < 4} />
        <Node x={SW.x} y={SW.y} label="Switch" sub="VLAN 10" />
        <Node x={SRV.x} y={SRV.y} w={124} label="Serveur DHCP" sub="10.20.1.10" active={step === 2 || step === 4} />
        {step === 1 && <Packet key="d" from={PC} to={SRV} label="DISCOVER" tone="var(--signal)" broadcast />}
        {step === 2 && <Packet key="o" from={SRV} to={PC} label="OFFER" tone="var(--ink-2)" />}
        {step === 3 && <Packet key="r" from={PC} to={SRV} label="REQUEST" tone="var(--signal)" broadcast />}
        {step === 4 && <Packet key="a" from={SRV} to={PC} label="ACK" tone="var(--ok)" />}
        {configured ? (
          <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
            <rect x={16} y={190} width={330} height={34} rx={8} fill="var(--ok-wash)" />
            <text x={30} y={211} fontSize={12} fill="var(--ink)" fontFamily="var(--font-mono)">
              bail 8 j, passerelle 10.20.10.1, DNS 10.20.1.10
            </text>
          </motion.g>
        ) : null}
      </svg>
    </DiagramFrame>
  );
}
