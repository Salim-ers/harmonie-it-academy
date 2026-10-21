"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Appear, Box, DiagramShell, MONO, Ripple, Token, type Pt } from "./shared";

type NodeId = "pc" | "sw" | "gw" | "web" | "dns";
type LinkId = "pc-sw" | "sw-gw" | "gw-web" | "gw-dns";

type JourneyStep = DiagramStep & { command: string; output: string; nodes: NodeId[]; links: LinkId[] };

const STEPS: JourneyStep[] = [
  {
    title: "Le poste connaît sa configuration",
    description:
      "Avant d'envoyer quoi que ce soit, le poste doit avoir une adresse, un masque, une passerelle et un serveur DNS. ipconfig /all teste ce premier maillon : le poste lui-même.",
    command: "ipconfig /all",
    output: "Adresse IPv4 10.20.10.87, masque 255.255.255.0, passerelle 10.20.10.1, serveurs DNS 10.20.1.10",
    nodes: ["pc"],
    links: [],
  },
  {
    title: "Premier saut : switch puis passerelle",
    description:
      "intranet.valmont.local n'est pas dans le réseau 10.20.10.0/24 : tout part vers la passerelle, en traversant le switch. Un ping de la passerelle teste le câble, le switch et le VLAN.",
    command: "ping 10.20.10.1",
    output: "Réponse de 10.20.10.1 : octets=32 temps<1ms TTL=255",
    nodes: ["pc", "sw", "gw"],
    links: ["pc-sw", "sw-gw"],
  },
  {
    title: "Requête DNS, puis réponse",
    description:
      "Le poste demande au serveur DNS 10.20.1.10 l'adresse d'intranet.valmont.local. La requête traverse switch et passerelle ; la réponse revient : 10.20.5.20.",
    command: "nslookup intranet.valmont.local",
    output: "Serveur : dc01.valmont.local, Address : 10.20.1.10. Nom : intranet.valmont.local, Address : 10.20.5.20",
    nodes: ["pc", "sw", "gw", "dns"],
    links: ["pc-sw", "sw-gw", "gw-dns"],
  },
  {
    title: "Le paquet traverse le réseau jusqu'au serveur",
    description: "Le poste envoie maintenant ses paquets à 10.20.5.20 : switch, passerelle, puis le réseau des serveurs. tracert montre chaque routeur traversé.",
    command: "tracert -d 10.20.5.20",
    output: "1   <1 ms   10.20.10.1   puis   2   1 ms   10.20.5.20   : itinéraire déterminé",
    nodes: ["pc", "sw", "gw", "web"],
    links: ["pc-sw", "sw-gw", "gw-web"],
  },
  {
    title: "Le service web répond-il ?",
    description:
      "Joindre le serveur ne suffit pas : il faut que le service écoute sur le bon port. Test-NetConnection tente une vraie connexion TCP sur le port 443 (HTTPS).",
    command: "Test-NetConnection intranet.valmont.local -Port 443",
    output: "RemoteAddress : 10.20.5.20, RemotePort : 443, TcpTestSucceeded : True",
    nodes: ["web"],
    links: ["pc-sw", "sw-gw", "gw-web"],
  },
  {
    title: "La réponse revient par le chemin inverse",
    description:
      "Le serveur renvoie la page au poste : passerelle, switch, poste. Une connexion TCP établie prouve que l'aller et le retour fonctionnent ; si le navigateur échoue encore, le problème est dans l'application ou le compte.",
    command: "Test-NetConnection intranet.valmont.local -Port 443",
    output: "TcpTestSucceeded : True, l'aller et le retour fonctionnent",
    nodes: ["pc", "sw", "gw", "web"],
    links: ["pc-sw", "sw-gw", "gw-web"],
  },
];

const N: Record<NodeId, Pt & { w: number; label: string; sub: string }> = {
  pc: { x: 62, y: 176, w: 104, label: "PC-CPT-014", sub: "10.20.10.87" },
  sw: { x: 180, y: 176, w: 88, label: "Switch", sub: "VLAN 10" },
  gw: { x: 306, y: 176, w: 112, label: "Passerelle", sub: "10.20.10.1" },
  web: { x: 452, y: 100, w: 116, label: "intranet", sub: "10.20.5.20" },
  dns: { x: 452, y: 252, w: 116, label: "DNS dc01", sub: "10.20.1.10" },
};
const L: Record<LinkId, [Pt, Pt]> = {
  "pc-sw": [
    { x: 114, y: 176 },
    { x: 136, y: 176 },
  ],
  "sw-gw": [
    { x: 224, y: 176 },
    { x: 250, y: 176 },
  ],
  "gw-web": [
    { x: 362, y: 164 },
    { x: 394, y: 112 },
  ],
  "gw-dns": [
    { x: 362, y: 188 },
    { x: 394, y: 240 },
  ],
};

/** Points de passage des jetons, au-dessus des boîtes. */
const P = { pc: { x: 62, y: 132 }, sw: { x: 180, y: 132 }, gw: { x: 306, y: 132 }, web: { x: 452, y: 142 }, dns: { x: 452, y: 212 } };

function Tokens({ step, reduced }: { step: number; reduced: boolean }) {
  switch (step) {
    case 0:
      return <Ripple at={{ x: N.pc.x, y: N.pc.y }} reduced={reduced} r={34} />;
    case 1:
      return <Token path={[P.pc, P.sw, P.gw, P.sw, P.pc]} label="ping" mono reduced={reduced} duration={1.5} />;
    case 2:
      return (
        <g>
          {!reduced ? <Token path={[P.pc, P.sw, P.gw, P.dns]} label="intranet ?" mono reduced={false} duration={0.75} /> : null}
          <Token path={[P.dns, P.gw, P.sw, P.pc]} label="10.20.5.20" mono reduced={reduced} delay={reduced ? 0 : 0.8} duration={0.75} color="var(--ok)" />
        </g>
      );
    case 3:
      return <Token path={[P.pc, P.sw, P.gw, P.web]} label="vers 10.20.5.20" reduced={reduced} duration={1.3} />;
    case 4:
      return (
        <g>
          {!reduced ? <Token path={[P.pc, P.sw, P.gw, P.web]} label="TCP 443" mono reduced={false} duration={0.75} /> : null}
          <Token path={[P.web, { x: 452, y: 142 }]} label="port ouvert" reduced={reduced} delay={reduced ? 0 : 0.8} duration={0.4} color="var(--ok)" />
        </g>
      );
    default:
      return <Token path={[P.web, P.gw, P.sw, P.pc]} label="page" reduced={reduced} duration={1.3} color="var(--ok)" />;
  }
}

export default function PacketJourneyDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const cur = STEPS[step];
  return (
    <DiagramShell
      title="Trajet d'un paquet du poste vers intranet.valmont.local et commande de diagnostic de chaque segment"
      steps={STEPS}
      state={s}
      stepExtra={
        <div className="rounded-[var(--radius-control)] bg-term-bg px-3 py-2 font-mono text-[13px]">
          <p className="text-term-fg">
            <span className="text-term-prompt">PS&gt; </span>
            {cur.command}
          </p>
          <p className="text-term-ok">{cur.output}</p>
        </div>
      }
    >
      <svg viewBox="0 0 520 290" className="h-auto w-full" aria-hidden="true">
        <Appear key={`cmd-${step}`} reduced={reduced} dy={-4}>
          <rect x={16} y={14} width={Math.min(488, cur.command.length * 7.3 + 28)} height={28} rx={8} fill="var(--term-bg)" />
          <text x={30} y={32} fontSize={12} fill="var(--term-fg)" fontFamily={MONO}>
            {cur.command}
          </text>
        </Appear>
        {(Object.keys(L) as LinkId[]).map((id) => {
          const [a, b] = L[id];
          const on = cur.links.includes(id);
          return <line key={id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? "var(--signal)" : "var(--line-strong)"} strokeWidth={on ? 2.5 : 1.5} />;
        })}
        {(Object.keys(N) as NodeId[]).map((id) => {
          const n = N[id];
          const on = cur.nodes.includes(id);
          const done = step === 5 && id === "pc";
          return <Box key={id} x={n.x} y={n.y} w={n.w} h={52} label={n.label} sub={n.sub} monoSub monoLabel={id === "pc"} active={on && !done} wash={on} tone={done ? "ok" : "default"} />;
        })}
        <g key={`tk-${step}`}>
          <Tokens step={step} reduced={reduced} />
        </g>
      </svg>
    </DiagramShell>
  );
}
