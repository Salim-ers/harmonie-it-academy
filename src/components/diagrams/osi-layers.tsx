"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useSteps, type DiagramStep } from "./frame";
import { ChoiceGroup, DiagramShell, Facts, InfoPanel, Label, MONO } from "./shared";

type LayerId = "7" | "6" | "5" | "4" | "3" | "2" | "1";

const LAYERS: Record<LayerId, { name: string; pdu: string; protocols: string; check: string; symptom: string }> = {
  "7": {
    name: "Application",
    pdu: "Données",
    protocols: "HTTP et HTTPS, DNS, SMTP, IMAP, SMB, RDP",
    check: "L'application, le compte, l'adresse saisie, le service côté serveur.",
    symptom: "Le réseau répond (ping, port ouvert), mais l'application affiche une erreur d'authentification ou une page d'erreur du serveur.",
  },
  "6": {
    name: "Présentation",
    pdu: "Données",
    protocols: "Formats et encodages (UTF-8, JPEG), chiffrement TLS souvent rangé ici",
    check: "Le certificat, l'encodage des caractères, le format du fichier.",
    symptom: "Avertissement de certificat dans le navigateur, ou caractères accentués remplacés par des symboles.",
  },
  "5": {
    name: "Session",
    pdu: "Données",
    protocols: "Ouverture, maintien et fermeture des dialogues (sessions RDP, SMB, RPC)",
    check: "Les délais d'inactivité, la reconnexion, les sessions restées ouvertes.",
    symptom: "La session Bureau à distance se coupe après quelques minutes d'inactivité.",
  },
  "4": {
    name: "Transport",
    pdu: "Segment",
    protocols: "TCP, UDP et les numéros de port",
    check: "Le port est-il ouvert ? Test-NetConnection -Port, règles de pare-feu.",
    symptom: "Le serveur répond au ping, mais l'application ne se connecte pas : un pare-feu bloque le port.",
  },
  "3": {
    name: "Réseau",
    pdu: "Paquet",
    protocols: "IP, ICMP, routage",
    check: "Adresse, masque, passerelle ; ipconfig, ping, tracert.",
    symptom: "Adresse en 169.254.x.x, ou passerelle injoignable : rien ne sort du réseau local.",
  },
  "2": {
    name: "Liaison de données",
    pdu: "Trame",
    protocols: "Ethernet, Wi-Fi (802.11), adresses MAC, VLAN ; ARP fait le lien avec la couche 3",
    check: "Le VLAN du port, la table MAC du switch, le cache ARP, un conflit d'adresse.",
    symptom: "Le poste obtient une adresse d'un autre réseau : sa prise est dans le mauvais VLAN.",
  },
  "1": {
    name: "Physique",
    pdu: "Bits",
    protocols: "Câbles, prises, fibre, ondes radio, voyants de lien",
    check: "Câble branché, voyants de la carte et du switch, prise brassée, signal Wi-Fi.",
    symptom: "Aucun voyant sur la carte réseau, Windows affiche « Câble réseau non connecté ».",
  },
};
const ORDER: LayerId[] = ["7", "6", "5", "4", "3", "2", "1"];
const TCPIP = [
  { name: "Application", from: 0, to: 2 },
  { name: "Transport", from: 3, to: 3 },
  { name: "Internet", from: 4, to: 4 },
  { name: "Accès réseau", from: 5, to: 6 },
];

const STEPS: DiagramStep[] = [
  {
    title: "Couches 7 à 5 : les données",
    description: "Le navigateur prépare une requête HTTPS vers l'intranet. Les couches hautes produisent les données à envoyer.",
  },
  {
    title: "Couche 4 : le segment",
    description: "TCP ajoute son en-tête : port source 51234, port de destination 443, numéros de séquence. Données et en-tête forment un segment.",
  },
  {
    title: "Couche 3 : le paquet",
    description: "IP ajoute les adresses source 10.20.10.87 et destination 10.20.30.15. Le segment devient un paquet.",
  },
  {
    title: "Couche 2 : la trame",
    description:
      "Ethernet ajoute les adresses MAC (le poste et la passerelle) devant, et un code de contrôle (FCS) derrière. Le paquet devient une trame.",
  },
  {
    title: "Couche 1 : les bits",
    description: "La carte réseau transforme la trame en signaux électriques, lumineux ou radio : une suite de bits sur le câble ou dans l'air.",
  },
  {
    title: "À l'arrivée : la désencapsulation",
    description: "Le destinataire fait le chemin inverse : chaque couche lit et retire son en-tête, puis passe le reste à la couche du dessus.",
  },
];

const ROW_H = 40;
const ROW_GAP = 4;
const TOP = 30;
const rowY = (i: number) => TOP + i * (ROW_H + ROW_GAP);

/** Segments de l'unité de données à chaque couche (index de ligne). */
type Seg = { label: string; x: number; w: number; kind: "data" | "head" | "tail" };
const DATA: Seg = { label: "Données", x: 404, w: 66, kind: "data" };
const TCP: Seg = { label: "TCP", x: 372, w: 32, kind: "head" };
const IP: Seg = { label: "IP", x: 346, w: 26, kind: "head" };
const ETH: Seg = { label: "Eth", x: 316, w: 30, kind: "head" };
const FCS: Seg = { label: "FCS", x: 470, w: 32, kind: "tail" };
const PDU_ROWS: { row: number; segs: Seg[]; added?: string }[] = [
  { row: 2, segs: [DATA] },
  { row: 3, segs: [TCP, DATA], added: "TCP" },
  { row: 4, segs: [IP, TCP, DATA], added: "IP" },
  { row: 5, segs: [ETH, IP, TCP, DATA, FCS], added: "Eth" },
];

export default function OsiLayersDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const [layer, setLayer] = useState<LayerId | null>(null);
  const selIdx = layer ? ORDER.indexOf(layer) : -1;
  const info = layer ? LAYERS[layer] : null;
  const unwrap = step === 5;
  const encapRow = step === 0 ? 2 : step === 4 ? 6 : step + 2;

  return (
    <DiagramShell
      title="Les sept couches OSI face aux quatre couches TCP/IP, et l'encapsulation des données"
      steps={STEPS}
      state={s}
      controls={
        <div>
          <ChoiceGroup
            label="Choisissez une couche"
            options={ORDER.map((id) => ({ id, label: `${id}. ${LAYERS[id].name}` }))}
            value={layer}
            onChange={(id) => setLayer((cur) => (cur === id ? null : id))}
          />
          <InfoPanel title={info && layer ? `Couche ${layer}, ${info.name.toLowerCase()} (${info.pdu.toLowerCase()})` : "Du câble à l'application"}>
            {info ? (
              <Facts
                items={[
                  { term: "Exemples", value: info.protocols },
                  { term: "Le technicien vérifie", value: info.check },
                  { term: "Symptôme typique", value: info.symptom },
                ]}
              />
            ) : (
              <p>
                On diagnostique en général de bas en haut : le câble et le voyant (1), le VLAN (2), l&apos;adresse et la passerelle (3), le port (4),
                puis l&apos;application (7). Choisissez une couche pour voir ce qu&apos;on y vérifie et une panne typique.
              </p>
            )}
          </InfoPanel>
        </div>
      }
    >
      <svg viewBox="0 0 520 340" className="h-auto w-full" aria-hidden="true">
        <Label x={96} y={18} weight={600} color="var(--ink-2)">
          Modèle OSI
        </Label>
        <Label x={236} y={18} weight={600} color="var(--ink-2)">
          TCP/IP
        </Label>
        <Label x={410} y={18} weight={600} color="var(--ink-2)">
          {unwrap ? "Désencapsulation" : "Encapsulation"}
        </Label>

        {ORDER.map((id, i) => {
          const on = selIdx === i;
          const y = rowY(i);
          return (
            <g key={id}>
              <rect x={16} y={y} width={160} height={ROW_H} rx={8} fill={on ? "var(--signal-wash)" : "var(--surface)"} stroke={on ? "var(--signal)" : "var(--line-strong)"} strokeWidth={on ? 2 : 1.25} />
              <text x={30} y={y + 25} fontSize={13} fontWeight={700} fill="var(--muted)" fontFamily={MONO}>
                {id}
              </text>
              <text x={48} y={y + 25} fontSize={13} fontWeight={600} fill="var(--ink)">
                {LAYERS[id].name}
              </text>
            </g>
          );
        })}

        {TCPIP.map((t) => {
          const y = rowY(t.from);
          const h = rowY(t.to) + ROW_H - y;
          const on = selIdx >= t.from && selIdx <= t.to;
          return (
            <g key={t.name}>
              <rect x={184} y={y} width={104} height={h} rx={8} fill={on ? "var(--signal-wash)" : "var(--mist)"} stroke={on ? "var(--signal)" : "var(--line-strong)"} strokeWidth={on ? 2 : 1.25} />
              <text x={236} y={y + h / 2 + 4.5} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">
                {t.name}
              </text>
            </g>
          );
        })}

        {/* Unités de données */}
        {PDU_ROWS.map((r, k) => {
          const visible = unwrap || k <= step;
          if (!visible) return null;
          const y = rowY(r.row) + 9;
          const fresh = !unwrap && k === step;
          return (
            <motion.g key={`${r.row}-${unwrap}`} initial={reduced || !fresh ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              {r.segs.map((sg) => {
                const isNew = r.added === sg.label || (sg.kind === "tail" && r.added === "Eth");
                const hl = (fresh || unwrap) && isNew;
                return (
                  <g key={sg.label}>
                    <rect
                      x={sg.x}
                      y={y}
                      width={sg.w - 2}
                      height={22}
                      rx={4}
                      fill={sg.kind === "data" ? "var(--surface)" : hl ? "var(--signal)" : "var(--mist)"}
                      stroke={hl ? "var(--signal)" : "var(--line-strong)"}
                    />
                    <text x={sg.x + (sg.w - 2) / 2} y={y + 15} textAnchor="middle" fontSize={12} fontWeight={600} fill={hl && sg.kind !== "data" ? "var(--paper)" : "var(--ink-2)"}>
                      {sg.label}
                    </text>
                  </g>
                );
              })}
            </motion.g>
          );
        })}
        {unwrap || step >= 4 ? (
          <motion.text
            key={`bits-${unwrap}`}
            x={316}
            y={rowY(6) + 25}
            fontSize={12}
            fontFamily={MONO}
            fill={!unwrap && step === 4 ? "var(--signal)" : "var(--ink-2)"}
            initial={reduced || unwrap ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            0110 1001 0001 1101 0100 1…
          </motion.text>
        ) : null}
        {/* Repère de l'étape : descend pendant l'encapsulation, remonte à l'arrivée */}
        <motion.g
          initial={false}
          animate={{ y: unwrap ? [rowY(6) + ROW_H / 2, rowY(0) + ROW_H / 2] : rowY(encapRow) + ROW_H / 2 }}
          transition={{ duration: reduced ? 0 : unwrap ? 1.4 : 0.5 }}
        >
          <polygon points="298,-6 298,6 308,0" fill="var(--signal)" />
        </motion.g>
      </svg>
    </DiagramShell>
  );
}
