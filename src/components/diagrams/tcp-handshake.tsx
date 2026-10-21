"use client";

import { motion } from "motion/react";
import { useSteps, type DiagramStep } from "./frame";
import { Appear, ArrowHead, Box, DiagramShell, Label, MONO } from "./shared";

const STEPS: DiagramStep[] = [
  {
    title: "Avant la connexion",
    description:
      "Le serveur web 10.20.30.15 écoute sur le port 443 (état LISTEN). Le poste 10.20.10.87 choisit un port source temporaire, 51234. Aucune donnée ne peut encore circuler.",
  },
  {
    title: "SYN",
    description: "Le poste demande l'ouverture d'une connexion et annonce son numéro de séquence de départ (ici 100, en réalité un nombre aléatoire). Il passe en état SYN_SENT.",
  },
  {
    title: "SYN-ACK",
    description: "Le serveur accepte : il accuse réception (ack 101, « j'attends la suite à partir de 101 ») et annonce son propre numéro de départ, 300.",
  },
  {
    title: "ACK",
    description: "Le poste confirme (ack 301). Les deux côtés sont en état ESTABLISHED : la connexion est ouverte. C'est la poignée de main en trois temps.",
  },
  {
    title: "Données",
    description:
      "La requête HTTPS part, la page revient. Chaque segment est numéroté et acquitté : un segment perdu est renvoyé automatiquement, et l'ordre est rétabli à l'arrivée.",
  },
  {
    title: "FIN : fermeture",
    description:
      "Chaque côté ferme sa moitié de la connexion : FIN puis ACK dans un sens, FIN puis ACK dans l'autre. Le poste garde quelques instants l'état TIME_WAIT, visible avec netstat.",
  },
  {
    title: "Comparaison avec UDP",
    description:
      "UDP n'ouvre pas de connexion : le poste envoie directement un datagramme, ici une requête DNS du port 51734 vers 10.20.1.10 port 53. Pas de SYN, pas d'accusé de réception, pas de FIN. Si un datagramme se perd, UDP ne le renvoie pas : c'est l'application qui redemande.",
  },
];

const CX = 96;
const SX = 424;

type Msg = { y: number; dir: 1 | -1; label: string; step: number };
const TCP_MSGS: Msg[] = [
  { y: 112, dir: 1, label: "SYN  seq=100", step: 1 },
  { y: 148, dir: -1, label: "SYN-ACK  seq=300 ack=101", step: 2 },
  { y: 184, dir: 1, label: "ACK  ack=301", step: 3 },
  { y: 236, dir: 1, label: "Requête HTTPS", step: 4 },
  { y: 262, dir: -1, label: "Réponse et ACK", step: 4 },
  { y: 294, dir: 1, label: "FIN", step: 5 },
  { y: 312, dir: -1, label: "ACK", step: 5 },
  { y: 330, dir: -1, label: "FIN", step: 5 },
  { y: 348, dir: 1, label: "ACK", step: 5 },
];

const CLIENT_STATE = ["CLOSED", "SYN_SENT", "SYN_SENT", "ESTABLISHED", "ESTABLISHED", "TIME_WAIT"];
const SERVER_STATE = ["LISTEN", "LISTEN", "SYN_RECEIVED", "ESTABLISHED", "ESTABLISHED", "CLOSED"];

function Message({ m, current, reduced, delay = 0, lost = false }: { m: Msg; current: boolean; reduced: boolean; delay?: number; lost?: boolean }) {
  const from = m.dir === 1 ? CX : SX;
  const to = lost ? (CX + SX) / 2 + 20 : m.dir === 1 ? SX : CX;
  const color = lost ? "var(--danger)" : current ? "var(--signal)" : "var(--line-strong)";
  const angle = m.dir === 1 ? 0 : Math.PI;
  const tip = to - (lost ? 0 : m.dir * 3);
  const compact = m.y >= 290;
  return (
    <g>
      <motion.line
        x1={from}
        y1={m.y}
        x2={tip}
        y2={m.y}
        stroke={color}
        strokeWidth={current ? 2 : 1.5}
        strokeDasharray={lost ? "5 4" : undefined}
        initial={current && !reduced ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay, ease: "easeInOut" }}
      />
      {lost ? (
        <path d={`M${to - 5} ${m.y - 5} L${to + 5} ${m.y + 5} M${to + 5} ${m.y - 5} L${to - 5} ${m.y + 5}`} stroke="var(--danger)" strokeWidth={2} />
      ) : (
        <Appear reduced={reduced || !current} delay={delay + 0.6} dy={0}>
          <ArrowHead at={{ x: tip, y: m.y }} angle={angle} color={color} />
        </Appear>
      )}
      <text
        x={lost ? (CX + to) / 2 : (CX + SX) / 2}
        y={m.y - (compact ? 4 : 6)}
        textAnchor="middle"
        fontSize={12}
        fontFamily={MONO}
        fontWeight={current ? 600 : undefined}
        fill={lost ? "var(--danger)" : current ? "var(--signal)" : "var(--ink-2)"}
      >
        {m.label}
      </text>
    </g>
  );
}

export default function TcpHandshakeDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const udp = step === 6;
  const st = Math.min(step, 5);
  return (
    <DiagramShell title="Connexion TCP entre le poste et le serveur web : SYN, SYN-ACK, ACK, données et fermeture, puis comparaison avec UDP" steps={STEPS} state={s}>
      <svg viewBox="0 0 520 360" className="h-auto w-full" aria-hidden="true">
        {udp ? (
          <g key="udp">
            <Box x={CX} y={34} w={150} h={52} label="Poste" sub="10.20.10.87:51734" monoSub />
            <Box x={SX} y={34} w={150} h={52} label="Serveur DNS" sub="10.20.1.10:53" monoSub />
            <line x1={CX} y1={62} x2={CX} y2={300} stroke="var(--line-strong)" strokeDasharray="3 4" />
            <line x1={SX} y1={62} x2={SX} y2={300} stroke="var(--line-strong)" strokeDasharray="3 4" />
            <Label x={260} y={84} weight={600} color="var(--ink-2)">
              UDP : sans connexion
            </Label>
            <Message m={{ y: 126, dir: 1, label: "Requête DNS", step: 6 }} current reduced={reduced} />
            <Message m={{ y: 164, dir: -1, label: "Réponse DNS", step: 6 }} current reduced={reduced} delay={0.7} />
            <Message m={{ y: 222, dir: 1, label: "Datagramme perdu", step: 6 }} current reduced={reduced} delay={1} lost />
            <Appear reduced={reduced} delay={1.3}>
              <Label x={260} y={262}>
                Aucun renvoi automatique : l&apos;application redemande
              </Label>
              <Label x={260} y={292} color="var(--muted)">
                Ni SYN, ni ACK, ni FIN
              </Label>
            </Appear>
          </g>
        ) : (
          <g key="tcp">
            <Box x={CX} y={34} w={150} h={52} label="Poste" sub="10.20.10.87:51234" monoSub />
            <Box x={SX} y={34} w={150} h={52} label="Serveur web" sub="10.20.30.15:443" monoSub />
            <line x1={CX} y1={84} x2={CX} y2={354} stroke="var(--line-strong)" strokeDasharray="3 4" />
            <line x1={SX} y1={84} x2={SX} y2={354} stroke="var(--line-strong)" strokeDasharray="3 4" />
            <Appear key={`cs-${st}`} reduced={reduced} dy={0}>
              <rect x={CX - 52} y={66} width={104} height={20} rx={10} fill={st >= 3 && st <= 4 ? "var(--ok-wash)" : "var(--mist)"} />
              <text x={CX} y={80} textAnchor="middle" fontSize={12} fontFamily={MONO} fill={st >= 3 && st <= 4 ? "var(--ok)" : "var(--ink-2)"}>
                {CLIENT_STATE[st]}
              </text>
            </Appear>
            <Appear key={`ss-${st}`} reduced={reduced} dy={0}>
              <rect x={SX - 56} y={66} width={112} height={20} rx={10} fill={st >= 3 && st <= 4 ? "var(--ok-wash)" : "var(--mist)"} />
              <text x={SX} y={80} textAnchor="middle" fontSize={12} fontFamily={MONO} fill={st >= 3 && st <= 4 ? "var(--ok)" : "var(--ink-2)"}>
                {SERVER_STATE[st]}
              </text>
            </Appear>
            {TCP_MSGS.filter((m) => m.step <= step).map((m, i) => {
              const current = m.step === step;
              const order = TCP_MSGS.filter((x) => x.step === m.step).indexOf(m);
              return <Message key={`${i}-${current}`} m={m} current={current} reduced={reduced} delay={current ? order * 0.3 : 0} />;
            })}
            {step >= 3 ? (
              <Label x={260} y={210} color="var(--ok)">
                connexion établie
              </Label>
            ) : null}
          </g>
        )}
      </svg>
    </DiagramShell>
  );
}
