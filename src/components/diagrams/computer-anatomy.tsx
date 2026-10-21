"use client";

import { useState } from "react";
import { ChoiceGroup, DiagramShell, Facts, InfoPanel, Label } from "./shared";

type PartId = "board" | "cpu" | "ram" | "ssd" | "psu" | "gpu" | "ports";

const PARTS: Record<PartId, { label: string; role: string; symptom: string; check: string }> = {
  board: {
    label: "Carte mère",
    role: "Le circuit sur lequel tout se branche. Elle relie les composants entre eux, porte le firmware UEFI et les ports, et distribue le courant reçu de l'alimentation.",
    symptom: "Aucun signe de vie alors que l'alimentation fonctionne, plusieurs ports morts en même temps, ou date et heure fausses à chaque démarrage (pile de sauvegarde usée).",
    check: "Noter le modèle et les voyants, tester avec un minimum de composants : c'est un diagnostic d'atelier, à escalader.",
  },
  cpu: {
    label: "Processeur (CPU)",
    role: "Il exécute les instructions des programmes. Il chauffe : un radiateur et un ventilateur l'accompagnent toujours.",
    symptom: "Lenteur avec un processeur à 100 % en continu, ventilateur très bruyant, arrêt brutal sous forte charge à cause d'une surchauffe.",
    check: "Gestionnaire des tâches, onglet Performance ; aérations dégagées, poussière dans le radiateur.",
  },
  ram: {
    label: "Mémoire vive (RAM)",
    role: "La mémoire de travail : elle garde les programmes et les fichiers ouverts. Elle est rapide et se vide à chaque extinction.",
    symptom: "Lenteur dès que beaucoup d'onglets ou d'applications sont ouverts (mémoire saturée). Une barrette défaillante provoque des écrans bleus aléatoires ou des bips au démarrage sans image.",
    check: "Gestionnaire des tâches, onglet Performance, Mémoire ; outil Diagnostic de mémoire Windows (mdsched.exe).",
  },
  ssd: {
    label: "Stockage (SSD NVMe)",
    role: "Il conserve Windows, les logiciels et les fichiers, même éteint. Le format M.2 NVMe passe par le bus PCIe : il est bien plus rapide qu'un SSD SATA ou un disque dur.",
    symptom: "Message « aucun périphérique de démarrage », gels de quelques secondes, fichiers corrompus. Un disque presque plein ralentit aussi tout le poste.",
    check: "Espace libre sur C:, état de santé du disque avec Get-PhysicalDisk (colonne HealthStatus).",
  },
  psu: {
    label: "Alimentation",
    role: "Elle transforme le courant du secteur (230 V alternatif) en tensions continues basses (12 V, 5 V, 3,3 V) pour les composants. Sur un portable, ce rôle est partagé entre chargeur et batterie.",
    symptom: "Aucun signe de vie, aucun ventilateur, ou extinctions brutales quand le poste travaille beaucoup.",
    check: "Prise, multiprise, interrupteur arrière, câble ; sur un portable, voyant du chargeur et autre chargeur compatible.",
  },
  gpu: {
    label: "Carte graphique (GPU)",
    role: "Elle calcule l'image envoyée aux écrans. Elle peut être intégrée au processeur ou être une carte dédiée dans un emplacement PCIe.",
    symptom: "Écran noir alors que le PC tourne (ventilateurs et voyants actifs), ou image avec des artefacts. Cas fréquent : l'écran est branché sur la sortie de la carte mère alors qu'une carte dédiée est installée.",
    check: "Câble vidéo, sortie utilisée, autre écran ; pilote dans le Gestionnaire de périphériques.",
  },
  ports: {
    label: "Ports",
    role: "Les connecteurs vers l'extérieur : USB-A et USB-C, réseau RJ45, sorties vidéo HDMI et DisplayPort, audio.",
    symptom: "Périphérique non reconnu sur un port mais reconnu sur un autre, ou voyant de la prise RJ45 éteint : pas de lien physique avec le réseau.",
    check: "Essayer un autre port et un autre câble ; pour le réseau, voyants de lien et prise murale.",
  },
};
const ORDER: PartId[] = ["board", "cpu", "ram", "ssd", "gpu", "psu", "ports"];

export default function ComputerAnatomyDiagram() {
  const [sel, setSel] = useState<PartId | null>(null);
  const [hover, setHover] = useState<PartId | null>(null);
  const shown = hover ?? sel;
  const on = (id: PartId) => shown === id;
  const stroke = (id: PartId) => (on(id) ? "var(--signal)" : "var(--line-strong)");
  const fill = (id: PartId, base = "var(--surface)") => (on(id) ? "var(--signal-wash)" : base);
  const sw = (id: PartId) => (on(id) ? 2 : 1.25);
  const text = (id: PartId) => (on(id) ? "var(--signal)" : "var(--ink)");
  const info = shown ? PARTS[shown] : null;
  /** Survol à la souris dans le schéma (les boutons restent la voie d'accès au clavier). */
  const bind = (id: PartId) => ({
    onMouseEnter: () => setHover(id),
    onMouseLeave: () => setHover(null),
    onClick: () => setSel((cur) => (cur === id ? null : id)),
    style: { cursor: "pointer" },
  });

  return (
    <DiagramShell
      title="Anatomie d'un ordinateur : carte mère, processeur, mémoire, stockage NVMe, carte graphique, alimentation et ports"
      controls={
        <div>
          <ChoiceGroup
            label="Survolez ou sélectionnez un composant"
            options={ORDER.map((id) => ({ id, label: PARTS[id].label }))}
            value={sel}
            onChange={(id) => setSel((cur) => (cur === id ? null : id))}
            onPreview={setHover}
          />
          <InfoPanel title={info ? info.label : "Tout passe par la carte mère"}>
            {info ? (
              <Facts
                items={[
                  { term: "Rôle", value: info.role },
                  { term: "Panne typique", value: info.symptom },
                  { term: "Que vérifier", value: info.check },
                ]}
              />
            ) : (
              <p>
                Le processeur, la mémoire, le stockage et la carte graphique sont branchés sur la carte mère, qui les relie entre eux et aux ports.
                L&apos;alimentation fournit le courant à l&apos;ensemble. Choisissez un composant pour voir son rôle et sa panne typique.
              </p>
            )}
          </InfoPanel>
        </div>
      }
    >
      <svg viewBox="0 0 520 320" className="h-auto w-full" aria-hidden="true">
        {/* Carte mère */}
        <g {...bind("board")}>
          <rect x={150} y={16} width={354} height={288} rx={10} fill={fill("board", "var(--mist)")} stroke={stroke("board")} strokeWidth={sw("board")} />
          <Label x={492} y={294} anchor="end" weight={600} size={13} color={text("board")}>
            Carte mère
          </Label>
        </g>
        {/* Pistes (bus) */}
        <path d="M300 136 V170 M300 92 H360 M340 196 V214 M196 92 H250" stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 3" fill="none" />

        {/* Ports (panneau arrière) */}
        <g {...bind("ports")}>
        <rect x={162} y={34} width={46} height={124} rx={6} fill={fill("ports")} stroke={stroke("ports")} strokeWidth={sw("ports")} />
        {[50, 66].map((y) => (
          <rect key={y} x={174} y={y} width={22} height={9} rx={2} fill="none" stroke={stroke("ports")} />
        ))}
        <rect x={177} y={84} width={16} height={8} rx={3} fill="none" stroke={stroke("ports")} />
        <path d="M174 106 h22 v14 h-5 v4 h-12 v-4 h-5 z" fill="none" stroke={stroke("ports")} />
        <rect x={174} y={134} width={22} height={10} rx={2} fill="none" stroke={stroke("ports")} />
        <Label x={140} y={82} anchor="end" weight={600} size={13} color={text("ports")}>
          Ports
        </Label>
        <Label x={140} y={98} anchor="end">
          USB, RJ45,
        </Label>
        <Label x={140} y={113} anchor="end">
          HDMI
        </Label>
        <line x1={144} y1={92} x2={160} y2={92} stroke={stroke("ports")} />
        </g>

        {/* Processeur */}
        <g {...bind("cpu")}>
        <rect x={250} y={44} width={100} height={92} rx={8} fill={fill("cpu")} stroke={stroke("cpu")} strokeWidth={sw("cpu")} />
        <rect x={270} y={62} width={60} height={56} rx={4} fill="none" stroke={stroke("cpu")} strokeDasharray="3 3" />
        <text x={300} y={95} textAnchor="middle" fontSize={13} fontWeight={600} fill={text("cpu")}>
          CPU
        </text>
        </g>

        {/* Mémoire : quatre emplacements, deux barrettes */}
        <g {...bind("ram")}>
        {[376, 392, 408, 424].map((x, i) => (
          <rect key={x} x={x} y={36} width={10} height={132} rx={2} fill={i % 2 === 0 ? fill("ram", "var(--surface)") : "var(--mist)"} stroke={stroke("ram")} strokeWidth={i % 2 === 0 ? sw("ram") : 1} />
        ))}
        <text x={405} y={186} textAnchor="middle" fontSize={13} fontWeight={600} fill={text("ram")}>
          RAM
        </text>
        </g>

        {/* SSD NVMe (M.2) */}
        <g {...bind("ssd")}>
        <rect x={226} y={170} width={134} height={26} rx={5} fill={fill("ssd")} stroke={stroke("ssd")} strokeWidth={sw("ssd")} />
        <circle cx={352} cy={183} r={3} fill="none" stroke={stroke("ssd")} />
        <text x={286} y={188} textAnchor="middle" fontSize={12} fontWeight={600} fill={text("ssd")}>
          SSD NVMe (M.2)
        </text>
        </g>

        {/* Carte graphique (PCIe) */}
        <g {...bind("gpu")}>
        <rect x={216} y={222} width={250} height={44} rx={7} fill={fill("gpu")} stroke={stroke("gpu")} strokeWidth={sw("gpu")} />
        <circle cx={262} cy={244} r={14} fill="none" stroke={stroke("gpu")} />
        <circle cx={420} cy={244} r={14} fill="none" stroke={stroke("gpu")} />
        <text x={341} y={249} textAnchor="middle" fontSize={13} fontWeight={600} fill={text("gpu")}>
          Carte graphique
        </text>
        <line x1={232} y1={270} x2={450} y2={270} stroke={stroke("gpu")} strokeWidth={3} />
        </g>

        {/* Alimentation et câbles */}
        <g {...bind("psu")}>
        <rect x={16} y={206} width={112} height={88} rx={10} fill={fill("psu")} stroke={stroke("psu")} strokeWidth={sw("psu")} />
        <text x={72} y={232} textAnchor="middle" fontSize={13} fontWeight={600} fill={text("psu")}>
          Alimentation
        </text>
        <text x={72} y={248} textAnchor="middle" fontSize={12} fill="var(--muted)">
          230 V
        </text>
        <circle cx={72} cy={272} r={12} fill="none" stroke={stroke("psu")} />
        <path d="M128 226 C150 226 150 186 172 186 H200" fill="none" stroke={stroke("psu")} strokeWidth={2} />
        <rect x={198} y={178} width={16} height={18} rx={2} fill="var(--surface)" stroke={stroke("psu")} />
        <path d="M128 276 C160 276 170 244 214 244" fill="none" stroke={stroke("psu")} strokeWidth={2} />
        </g>
      </svg>
    </DiagramShell>
  );
}
