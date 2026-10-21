"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Appear, Box, DiagramShell, Label, Token, TravelDot, type Pt } from "./shared";

const STEPS: DiagramStep[] = [
  {
    title: "Le poste regarde d'abord son cache",
    description:
      "L'utilisateur ouvre www.exemple.fr. Le poste consulte son cache DNS local (visible avec ipconfig /displaydns) et le fichier hosts : aucune entrée.",
  },
  {
    title: "Requête récursive au DNS interne",
    description:
      "Le poste demande à son serveur DNS, 10.20.1.10 : « donne-moi la réponse finale ». Le serveur cherche dans son propre cache : rien non plus. Il va faire le travail à la place du poste.",
  },
  {
    title: "Le serveur racine oriente vers .fr",
    description:
      "Le DNS interne interroge un serveur racine. Celui-ci ne connaît pas www.exemple.fr, mais il sait qui gère .fr : il renvoie la liste des serveurs du domaine de premier niveau.",
  },
  {
    title: "Le serveur de .fr oriente vers exemple.fr",
    description: "Le serveur de .fr ne connaît pas la réponse non plus, mais il indique les serveurs qui font autorité pour exemple.fr.",
  },
  {
    title: "Le serveur faisant autorité répond",
    description: "Le serveur de exemple.fr connaît la réponse : www.exemple.fr a pour adresse 192.0.2.80, avec une durée de vie (TTL) de 3 600 secondes.",
  },
  {
    title: "Réponse mise en cache et renvoyée",
    description:
      "Le DNS interne garde la réponse en cache pendant le TTL et la renvoie au poste, qui la met aussi en cache. La prochaine demande sera servie immédiatement, sans repasser par Internet.",
  },
];

const PC = { x: 62, y: 130 };
const DNS = { x: 214, y: 130 };
const ROOT = { x: 432, y: 52 };
const TLD = { x: 432, y: 150 };
const AUTH = { x: 432, y: 248 };
const ABOVE_DNS = { x: 214, y: 84 };
const ABOVE_PC = { x: 62, y: 84 };

const OUT: Record<"root" | "tld" | "auth", [Pt, Pt]> = {
  root: [
    { x: 284, y: 116 },
    { x: 354, y: 62 },
  ],
  tld: [
    { x: 284, y: 132 },
    { x: 354, y: 148 },
  ],
  auth: [
    { x: 284, y: 146 },
    { x: 354, y: 236 },
  ],
};

export default function DnsResolutionDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const cached = step === 5;
  const target = step === 2 ? "root" : step === 3 ? "tld" : step === 4 ? "auth" : null;
  return (
    <DiagramShell title="Résolution DNS de www.exemple.fr : cache local, DNS interne, puis racine, .fr et serveur faisant autorité" steps={STEPS} state={s}>
      <svg viewBox="0 0 520 300" className="h-auto w-full" aria-hidden="true">
        <line x1={306} y1={14} x2={306} y2={292} stroke="var(--line)" strokeDasharray="4 4" />
        <Label x={296} y={22} anchor="end">
          Réseau Valmont
        </Label>
        <Label x={316} y={22} anchor="start">
          Internet
        </Label>
        <Label x={316} y={292} anchor="start">
          requêtes itératives
        </Label>

        {/* Liens */}
        <line x1={116} y1={130} x2={144} y2={130} stroke={step === 1 || step === 5 ? "var(--signal)" : "var(--line-strong)"} strokeWidth={step === 1 || step === 5 ? 2 : 1.5} />
        <line x1={PC.x} y1={158} x2={PC.x} y2={200} stroke={step === 0 || cached ? "var(--signal)" : "var(--line-strong)"} strokeWidth={1.5} />
        <line x1={DNS.x} y1={158} x2={DNS.x} y2={200} stroke={step === 1 || cached ? "var(--signal)" : "var(--line-strong)"} strokeWidth={1.5} />
        {(Object.keys(OUT) as (keyof typeof OUT)[]).map((k) => (
          <line key={k} x1={OUT[k][0].x} y1={OUT[k][0].y} x2={OUT[k][1].x} y2={OUT[k][1].y} stroke={target === k ? "var(--signal)" : "var(--line-strong)"} strokeWidth={target === k ? 2 : 1.5} />
        ))}

        <Box x={PC.x} y={PC.y} w={104} h={52} label="PC-CPT-014" monoLabel sub="10.20.10.87" monoSub active={step === 0 || step === 5} wash={step === 0} tone={cached ? "ok" : "default"} />
        <Box x={DNS.x} y={DNS.y} w={140} h={52} label="DNS interne" sub="10.20.1.10" monoSub active={step >= 1 && step <= 4} wash={step >= 1 && step <= 4} />
        <Box x={ROOT.x} y={ROOT.y} w={150} h={52} label="Serveur racine" sub="." monoSub active={step === 2} wash={step === 2} />
        <Box x={TLD.x} y={TLD.y} w={150} h={52} label="Serveur de .fr" sub="fr." monoSub active={step === 3} wash={step === 3} />
        <Box x={AUTH.x} y={AUTH.y} w={150} h={52} label="Faisant autorité" sub="exemple.fr." monoSub active={step === 4} wash={step === 4} tone={step === 4 ? "ok" : "default"} />

        {/* Caches */}
        <Box x={PC.x} y={230} w={104} h={56} label="Cache local" sub={cached ? "192.0.2.80" : "aucune entrée"} monoSub={cached} tone={cached ? "ok" : step === 0 ? "danger" : "default"} wash={cached || step === 0} />
        <Box x={DNS.x} y={230} w={140} h={56} label="Cache du serveur" sub={cached ? "192.0.2.80" : "aucune entrée"} monoSub={cached} tone={cached ? "ok" : step === 1 ? "danger" : "default"} wash={cached || step === 1} />
        {cached ? (
          <Appear reduced={reduced} delay={0.2}>
            <Label x={DNS.x} y={276} mono>
              TTL 3600 s
            </Label>
          </Appear>
        ) : null}

        <g key={`m-${step}`}>
          {step === 0 ? <TravelDot path={[{ x: PC.x, y: 160 }, { x: PC.x, y: 200 }, { x: PC.x, y: 160 }]} reduced={reduced} /> : null}
          {step === 1 ? (
            <g>
              <Token path={[{ x: PC.x, y: 84 }, ABOVE_DNS]} label="www.exemple.fr ?" mono reduced={reduced} duration={0.8} />
              <TravelDot path={[{ x: DNS.x, y: 160 }, { x: DNS.x, y: 200 }, { x: DNS.x, y: 160 }]} reduced={reduced} delay={0.8} />
            </g>
          ) : null}
          {target ? (
            <g>
              <TravelDot path={OUT[target]} reduced={reduced} duration={0.6} />
              <Token
                path={[target === "root" ? ROOT : target === "tld" ? TLD : AUTH, ABOVE_DNS]}
                label={target === "root" ? "voir fr." : target === "tld" ? "voir exemple.fr." : "192.0.2.80"}
                mono
                reduced={reduced}
                delay={reduced ? 0 : 0.65}
                duration={0.8}
                color={target === "auth" ? "var(--ok)" : "var(--ink-2)"}
              />
            </g>
          ) : null}
          {cached ? <Token path={[ABOVE_DNS, ABOVE_PC]} label="192.0.2.80" mono reduced={reduced} duration={0.8} color="var(--ok)" /> : null}
        </g>
      </svg>
    </DiagramShell>
  );
}
