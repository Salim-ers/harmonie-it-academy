"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Appear, Box, DiagramShell, Label, MONO, Ripple, Token, type Pt } from "./shared";

const STEPS: DiagramStep[] = [
  {
    title: "PC A veut joindre 10.20.10.21",
    description:
      "PC A (10.20.10.87) doit envoyer un document à l'imprimante 10.20.10.21. Elle est dans le même réseau 10.20.10.0/24 : pas besoin de passerelle, mais il faut son adresse MAC pour construire la trame. Son cache ARP ne la contient pas.",
  },
  {
    title: "Requête ARP en diffusion",
    description:
      "PC A envoie à l'adresse MAC de diffusion FF-FF-FF-FF-FF-FF : « Qui a 10.20.10.21 ? Répondez à 10.20.10.87, MAC 3C-52-82-4A-19-07. »",
  },
  {
    title: "Le switch apprend et inonde",
    description:
      "Le switch note que la MAC source 3c52.824a.1907 (notation Cisco de 3C-52-82-4A-19-07) se trouve derrière le port Gi1/0/12. Comme la destination est une diffusion, il recopie la trame sur tous les autres ports du VLAN 10.",
  },
  {
    title: "Seul le bon appareil se reconnaît",
    description:
      "Le poste voisin lit la question, voit que 10.20.10.21 n'est pas son adresse et l'ignore. L'imprimante se reconnaît et note au passage la MAC de PC A.",
  },
  {
    title: "Réponse ARP en envoi direct",
    description:
      "L'imprimante répond uniquement à PC A : « 10.20.10.21, c'est moi, MAC 00-80-77-3A-15-C2. » Le switch apprend cette MAC sur le port Gi1/0/5 et ne transmet la réponse que vers Gi1/0/12. PC A ajoute l'entrée à son cache ARP.",
  },
  {
    title: "La trame part directement",
    description:
      "PC A construit la trame avec la MAC de l'imprimante. Le switch connaît maintenant le port de destination : la trame sort uniquement sur Gi1/0/5, le voisin ne reçoit rien. arp -a sur PC A affiche la nouvelle entrée.",
  },
];

const SW = { x: 260, y: 48 };
const A = { x: 70, y: 158 };
const V = { x: 260, y: 158 };
const PR = { x: 450, y: 158 };
/** Points de passage des messages, sur les liens. */
const LA: Pt[] = [
  { x: 76, y: 126 },
  { x: 214, y: 66 },
];
const LV: Pt[] = [
  { x: 260, y: 78 },
  { x: 260, y: 124 },
];
const LP: Pt[] = [
  { x: 306, y: 66 },
  { x: 444, y: 126 },
];

type LinkId = "a" | "v" | "p";
const LIT: LinkId[][] = [[], ["a"], ["v", "p"], [], ["p", "a"], ["a", "p"]];

export default function ArpExchangeDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const lit = LIT[step];
  const linkColor = (id: LinkId) => (lit.includes(id) ? "var(--signal)" : "var(--line-strong)");
  const linkWidth = (id: LinkId) => (lit.includes(id) ? 2.5 : 1.5);
  const macRows = [
    { mac: "0000.5e00.010a", port: "Gi1/0/48", show: true, fresh: false },
    { mac: "3c52.824a.1907", port: "Gi1/0/12", show: step >= 2, fresh: step === 2 },
    { mac: "0080.773a.15c2", port: "Gi1/0/5", show: step >= 4, fresh: step === 4 },
  ];
  const arpRows = [
    { ip: "10.20.10.1", mac: "00-00-5E-00-01-0A", show: true, fresh: false },
    { ip: "10.20.10.21", mac: "00-80-77-3A-15-C2", show: step >= 4, fresh: step === 4 },
  ];

  return (
    <DiagramShell title="Échange ARP entre PC A et l'imprimante 10.20.10.21, avec le cache ARP du poste et la table MAC du switch" steps={STEPS} state={s}>
      <svg viewBox="0 0 520 346" className="h-auto w-full" aria-hidden="true">
        <line x1={LA[0].x} y1={LA[0].y + 4} x2={LA[1].x - 4} y2={LA[1].y + 8} stroke={linkColor("a")} strokeWidth={linkWidth("a")} />
        <line x1={LV[0].x} y1={LV[0].y} x2={LV[1].x} y2={LV[1].y + 6} stroke={linkColor("v")} strokeWidth={linkWidth("v")} />
        <line x1={LP[0].x + 4} y1={LP[0].y + 8} x2={LP[1].x} y2={LP[1].y + 4} stroke={linkColor("p")} strokeWidth={linkWidth("p")} />
        <Label x={128} y={86} anchor="end" mono>
          Gi1/0/12
        </Label>
        <Label x={268} y={108} anchor="start" mono>
          Gi1/0/8
        </Label>
        <Label x={392} y={86} anchor="start" mono>
          Gi1/0/5
        </Label>

        <Box x={SW.x} y={SW.y} w={176} h={52} label="Switch" sub="SW-SIEGE-ET2" monoSub active={step === 2} wash={step === 2 || step === 4} />
        <Box x={A.x} y={A.y} w={124} h={52} label="PC A" sub="10.20.10.87" monoSub active={step === 0 || step === 1 || step === 5} wash={step === 0 || step === 5} />
        <Box x={V.x} y={V.y} w={124} h={52} label="Poste voisin" sub="10.20.10.64" monoSub tone={step === 3 ? "muted" : "default"} dim={step >= 3} />
        <Box x={PR.x} y={PR.y} w={124} h={52} label="Imprimante" sub="10.20.10.21" monoSub tone={step === 3 ? "ok" : "default"} wash={step === 3} active={step === 4} />
        {step === 3 ? (
          <Appear reduced={reduced}>
            <Label x={V.x} y={198}>
              pas pour moi, ignorée
            </Label>
            <Label x={PR.x} y={198} color="var(--ok)" weight={600}>
              c&apos;est moi
            </Label>
          </Appear>
        ) : null}

        {/* Cache ARP de PC A */}
        <rect x={12} y={212} width={242} height={124} rx={10} fill="var(--surface)" stroke={step >= 4 ? "var(--signal)" : "var(--line-strong)"} strokeWidth={step === 4 ? 2 : 1.25} />
        <Label x={26} y={234} anchor="start" weight={600} color="var(--ink-2)">
          Cache ARP de PC A
        </Label>
        <Label x={26} y={256} anchor="start">
          Adresse IP
        </Label>
        <Label x={120} y={256} anchor="start">
          Adresse MAC
        </Label>
        {arpRows.map((r, i) =>
          r.show ? (
            <Appear key={r.ip} reduced={reduced || !r.fresh} delay={r.fresh ? 1.1 : 0} dy={0} dx={-6}>
              {r.fresh ? <rect x={18} y={265 + i * 24} width={230} height={22} rx={5} fill="var(--signal-wash)" /> : null}
              <text x={26} y={280 + i * 24} fontSize={12} fontFamily={MONO} fill="var(--ink)">
                {r.ip}
              </text>
              <text x={120} y={280 + i * 24} fontSize={12} fontFamily={MONO} fill="var(--ink)">
                {r.mac}
              </text>
            </Appear>
          ) : null,
        )}
        {step < 4 ? (
          <text x={26} y={304} fontSize={12} fill={step === 0 ? "var(--danger)" : "var(--muted)"}>
            10.20.10.21 : aucune entrée
          </text>
        ) : null}

        {/* Table MAC du switch */}
        <rect x={266} y={212} width={242} height={124} rx={10} fill="var(--surface)" stroke={step === 2 || step === 4 ? "var(--signal)" : "var(--line-strong)"} strokeWidth={step === 2 || step === 4 ? 2 : 1.25} />
        <Label x={280} y={234} anchor="start" weight={600} color="var(--ink-2)">
          Table MAC du switch, VLAN 10
        </Label>
        <Label x={280} y={256} anchor="start">
          Adresse MAC
        </Label>
        <Label x={420} y={256} anchor="start">
          Port
        </Label>
        {macRows.map((r, i) =>
          r.show ? (
            <Appear key={r.mac} reduced={reduced || !r.fresh} delay={r.fresh ? 0.6 : 0} dy={0} dx={-6}>
              {r.fresh ? <rect x={272} y={265 + i * 24} width={230} height={22} rx={5} fill="var(--signal-wash)" /> : null}
              <text x={280} y={280 + i * 24} fontSize={12} fontFamily={MONO} fill="var(--ink)">
                {r.mac}
              </text>
              <text x={420} y={280 + i * 24} fontSize={12} fontFamily={MONO} fill="var(--ink)">
                {r.port}
              </text>
            </Appear>
          ) : null,
        )}

        <g key={`m-${step}`}>
          {step === 1 ? <Token path={[LA[0], LA[1]]} label="Qui a 10.20.10.21 ?" reduced={reduced} fade duration={1} /> : null}
          {step === 2 ? (
            <g>
              <Ripple at={SW} reduced={reduced} r={40} />
              <Token path={[LP[0], LP[1]]} label="diffusion" reduced={reduced} fade duration={1} delay={0.3} />
              <Token path={[LV[0], LV[1]]} label="diffusion" reduced={reduced} fade duration={1} delay={0.3} />
            </g>
          ) : null}
          {step === 4 ? <Token path={[LP[1], LP[0], LA[1], LA[0]]} label="Réponse ARP" reduced={reduced} fade duration={1.4} color="var(--ok)" /> : null}
          {step === 5 ? <Token path={[LA[0], LA[1], LP[0], LP[1]]} label="Trame" reduced={reduced} fade duration={1.4} /> : null}
        </g>
      </svg>
    </DiagramShell>
  );
}
