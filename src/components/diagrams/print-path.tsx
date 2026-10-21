"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Appear, Arrow, Box, DiagramShell, Label, Token, type Pt } from "./shared";

type PrintStep = DiagramStep & { rupture: string; at: ElementId };
type ElementId = "app" | "driver" | "spooler" | "port" | "printer" | "wms" | "thermal";

const STEPS: PrintStep[] = [
  {
    at: "app",
    title: "Application",
    description: "Au service RH, Mme Lambert clique sur Imprimer dans Word. L'application ne parle pas à l'imprimante : elle confie le document à Windows.",
    rupture: "La mauvaise imprimante est sélectionnée (imprimante par défaut changée, « Microsoft Print to PDF »), ou l'application elle-même est figée.",
  },
  {
    at: "driver",
    title: "Pilote",
    description: "Le pilote traduit le document dans le langage de l'imprimante, ici PCL, avec les réglages choisis : bac, recto verso, couleur.",
    rupture: "Un pilote inadapté ou endommagé : pages remplies de caractères étranges, mise en page fausse, options de bac absentes.",
  },
  {
    at: "spooler",
    title: "Spouleur et file d'attente du serveur",
    description:
      "Le spouleur du poste remet la tâche au serveur d'impression SRV-IMP01, qui la range dans la file \\\\SRV-IMP01\\IMP-2E-RH et envoie les tâches une par une.",
    rupture:
      "Une tâche en erreur en tête de file bloque toutes les autres. On annule cette tâche-là ; redémarrer le spouleur du serveur ferait perdre les impressions de tout le monde.",
  },
  {
    at: "port",
    title: "Port TCP/IP standard",
    description: "Le port de la file pointe vers l'adresse de l'imprimante. Les données partent en mode RAW sur le port TCP 9100, le plus répandu.",
    rupture:
      "L'imprimante a changé d'adresse (DHCP sans réservation) : le port pointe vers l'ancienne. Test-NetConnection -ComputerName 10.20.12.30 -Port 9100 le confirme.",
  },
  {
    at: "printer",
    title: "Imprimante",
    description: "L'imprimante IMP-2E-RH reçoit les données et imprime la page.",
    rupture: "Le plus fréquent reste physique : bac vide, bourrage, toner épuisé, capot ouvert. L'écran de l'imprimante le dit souvent.",
  },
  {
    at: "thermal",
    title: "En parallèle : le WMS imprime en direct",
    description:
      "À l'entrepôt, le logiciel de gestion d'entrepôt (WMS) envoie les étiquettes en langage ZPL directement à l'imprimante thermique, sur le port 9100, sans pilote Windows ni spouleur.",
    rupture:
      "Imprimante injoignable (adresse changée, Wi-Fi d'entrepôt), rouleau d'étiquettes ou ruban épuisé, format d'étiquette mal calibré. Redémarrer un spouleur Windows n'y change rien.",
  },
];

const EL: Record<ElementId, Pt & { w: number; h: number }> = {
  app: { x: 66, y: 66, w: 100, h: 52 },
  driver: { x: 180, y: 66, w: 100, h: 52 },
  spooler: { x: 318, y: 66, w: 112, h: 52 },
  port: { x: 446, y: 66, w: 112, h: 52 },
  printer: { x: 446, y: 168, w: 112, h: 52 },
  wms: { x: 66, y: 266, w: 100, h: 52 },
  thermal: { x: 446, y: 266, w: 112, h: 56 },
};

const REST: Pt[] = [
  { x: 66, y: 116 },
  { x: 180, y: 116 },
  { x: 318, y: 116 },
  { x: 446, y: 116 },
  { x: 446, y: 210 },
];
const LABELS = ["Document", "PCL", "Tâche 14", "RAW 9100", "Page"];

function Rupture({ id, reduced }: { id: ElementId; reduced: boolean }) {
  const e = EL[id];
  const x = e.x + e.w / 2 - 4;
  const y = e.y - e.h / 2 + 4;
  return (
    <Appear key={id} reduced={reduced} delay={reduced ? 0 : 0.9} dy={0}>
      <circle cx={x} cy={y} r={9} fill="var(--danger)" />
      <text x={x} y={y + 4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--paper)">
        !
      </text>
    </Appear>
  );
}

export default function PrintPathDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const cur = STEPS[step];
  const office = step <= 4;
  return (
    <DiagramShell
      title="Chemin d'impression : application, pilote, spouleur et file du serveur, port TCP/IP 9100, imprimante ; en parallèle le WMS qui imprime en direct"
      steps={STEPS}
      state={s}
      stepExtra={
        <p className="rounded-[var(--radius-control)] border-l-2 border-danger bg-danger-wash px-3 py-2 text-ink-2">
          <span className="font-medium text-ink">Point de rupture le plus fréquent : </span>
          {cur.rupture}
        </p>
      }
    >
      <svg viewBox="0 0 520 300" className="h-auto w-full" aria-hidden="true">
        {/* Groupes */}
        <rect x={8} y={30} width={232} height={74} rx={10} fill="none" stroke="var(--line)" strokeDasharray="4 4" />
        <Label x={16} y={22} anchor="start">
          Poste PC-RH-022
        </Label>
        <rect x={252} y={30} width={260} height={74} rx={10} fill="none" stroke="var(--line)" strokeDasharray="4 4" />
        <Label x={260} y={22} anchor="start">
          Serveur d&apos;impression SRV-IMP01
        </Label>

        <g opacity={office ? 1 : 0.45} className="motion-safe:transition-opacity motion-safe:duration-300">
          <Arrow from={{ x: 117, y: 66 }} to={{ x: 129, y: 66 }} color={step === 1 ? "var(--signal)" : "var(--line-strong)"} />
          <Arrow from={{ x: 231, y: 66 }} to={{ x: 261, y: 66 }} color={step === 2 ? "var(--signal)" : "var(--line-strong)"} />
          <Arrow from={{ x: 375, y: 66 }} to={{ x: 389, y: 66 }} color={step === 3 ? "var(--signal)" : "var(--line-strong)"} />
          <Arrow from={{ x: 446, y: 128 }} to={{ x: 446, y: 141 }} color={step === 4 ? "var(--signal)" : "var(--line-strong)"} />
          <Box {...EL.app} label="Application" sub="Word" active={cur.at === "app"} wash={cur.at === "app"} />
          <Box {...EL.driver} label="Pilote" sub="PCL" monoSub active={cur.at === "driver"} wash={cur.at === "driver"} />
          <Box {...EL.spooler} label="Spouleur" sub="file IMP-2E-RH" active={cur.at === "spooler"} wash={cur.at === "spooler"} />
          <Box {...EL.port} label="Port TCP/IP" sub="TCP 9100" monoSub active={cur.at === "port"} wash={cur.at === "port"} />
          <Box {...EL.printer} label="Imprimante" sub="10.20.12.30" monoSub active={cur.at === "printer"} wash={cur.at === "printer"} />
        </g>

        {/* Entrepôt : impression directe */}
        <line x1={8} y1={232} x2={512} y2={232} stroke="var(--line)" strokeDasharray="4 4" />
        <Label x={16} y={226} anchor="start">
          Entrepôt : impression directe
        </Label>
        <g opacity={office ? 0.45 : 1} className="motion-safe:transition-opacity motion-safe:duration-300">
          <Box {...EL.wms} label="Logiciel WMS" sub="entrepôt" active={!office} wash={!office} />
          <Arrow from={{ x: 118, y: 266 }} to={{ x: 388, y: 266 }} color={!office ? "var(--signal)" : "var(--line-strong)"} width={!office ? 2 : 1.5} />
          <Label x={253} y={250}>
            ZPL en direct sur le port 9100
          </Label>
          <Label x={253} y={291}>
            sans pilote Windows ni spouleur
          </Label>
          <Box {...EL.thermal} label={"Imprimante\nthermique"} sub="10.20.30.81" monoSub active={cur.at === "thermal"} wash={cur.at === "thermal"} />
        </g>

        {office ? (
          <Token key={`t-${step}`} path={step === 0 ? [{ x: 66, y: 140 }, REST[0]] : [REST[step - 1], REST[step]]} label={LABELS[step]} reduced={reduced} color={step === 4 ? "var(--ok)" : "var(--signal)"} />
        ) : (
          <Token key="zpl" path={[{ x: 140, y: 266 }, { x: 360, y: 266 }]} label="ZPL" mono h={18} reduced={reduced} />
        )}
        <Rupture id={cur.at} reduced={reduced} />
      </svg>
    </DiagramShell>
  );
}
