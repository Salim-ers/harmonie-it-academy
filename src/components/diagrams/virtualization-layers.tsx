"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChoiceGroup, DiagramShell, InfoPanel, Label } from "./shared";

type ViewId = "physical" | "type1" | "type2" | "containers" | "snapshot";

const INFO: Record<ViewId, { label: string; title: string; text: string; examples: string }> = {
  physical: {
    label: "Physique",
    title: "Machine physique",
    text: "Un seul système d'exploitation, installé directement sur le matériel. C'est le cas d'un poste de travail classique : tout se règle sur la machine elle-même.",
    examples: "Un PC de bureau sous Windows 11.",
  },
  type1: {
    label: "Hyperviseur type 1",
    title: "Hyperviseur de type 1, directement sur le matériel",
    text: "L'hyperviseur s'installe sur le serveur sans système en dessous. Il partage processeur, mémoire, stockage et réseau entre plusieurs machines virtuelles isolées, chacune avec son propre système. C'est ce qui fait tourner les serveurs de l'entreprise : le N1 ne les redémarre pas et laisse la console de gestion au N2.",
    examples: "VMware ESXi (piloté par vCenter), Microsoft Hyper-V, Proxmox VE.",
  },
  type2: {
    label: "Hyperviseur type 2",
    title: "Hyperviseur de type 2, au-dessus d'un système hôte",
    text: "Un logiciel installé sur un Windows ou un macOS fait tourner des machines virtuelles. Pratique pour tester un logiciel, ouvrir un ancien système ou se former ; les performances sont un peu inférieures au type 1.",
    examples: "Oracle VirtualBox, VMware Workstation.",
  },
  containers: {
    label: "Conteneurs",
    title: "Conteneurs : le noyau est partagé",
    text: "Un conteneur n'embarque pas de système complet : seulement l'application et ses bibliothèques. Tous les conteneurs partagent le noyau du système hôte, ce qui les rend légers et rapides à démarrer. Ce ne sont pas des machines virtuelles : un conteneur Linux a besoin d'un noyau Linux.",
    examples: "Docker pour les créer et les lancer, Kubernetes pour les orchestrer à grande échelle.",
  },
  snapshot: {
    label: "Snapshot",
    title: "Snapshot : un point dans le temps, pas une sauvegarde",
    text: "Un snapshot (point de contrôle dans Hyper-V) fige l'état d'une VM à un instant : on peut y revenir en quelques secondes si une mise à jour tourne mal. Mais il enregistre seulement les différences depuis cet instant, dans des fichiers rangés au même endroit que la VM et liés à son disque. Si ce stockage tombe en panne, VM et snapshot disparaissent ensemble ; gardé des semaines, il grossit et ralentit la VM. Une sauvegarde, elle, est une copie complète et indépendante, stockée ailleurs.",
    examples: "Snapshot avant une mise à jour, supprimé une fois la mise à jour validée.",
  },
};
const ORDER: ViewId[] = ["physical", "type1", "type2", "containers", "snapshot"];

const COL_W = 116;
const colX = (i: number) => 12 + i * 127;
const L = (level: number) => 222 - level * 36;
const H = 32;

function Layer({ col, level, label, on, accent = false, dx = 0, w = COL_W, h = H, dashed = false, y }: { col: number; level: number; label: string; on: boolean; accent?: boolean; dx?: number; w?: number; h?: number; dashed?: boolean; y?: number }) {
  const x = colX(col) + dx;
  const top = y ?? L(level);
  return (
    <g>
      <rect
        x={x}
        y={top}
        width={w}
        height={h}
        rx={7}
        fill={accent && on ? "var(--signal-wash)" : level === 0 ? "var(--mist)" : "var(--surface)"}
        stroke={accent && on ? "var(--signal)" : on ? "var(--ink-2)" : "var(--line-strong)"}
        strokeWidth={accent && on ? 2 : 1.25}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      {label ? (
        <text x={x + w / 2} y={top + h / 2 + 4.5} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">
          {label}
        </text>
      ) : null}
    </g>
  );
}

export default function VirtualizationLayersDiagram() {
  const reduced = Boolean(useReducedMotion());
  const [view, setView] = useState<ViewId | null>(null);
  const info = view ? INFO[view] : null;
  const dim = (id: ViewId) => view !== null && view !== id && !(view === "snapshot" && id === "type1");
  const headers: { id: ViewId; title: string; sub: string }[] = [
    { id: "physical", title: "Physique", sub: "OS sur le matériel" },
    { id: "type1", title: "Type 1", sub: "hyperviseur nu" },
    { id: "type2", title: "Type 2", sub: "sur un OS hôte" },
    { id: "containers", title: "Conteneurs", sub: "noyau partagé" },
  ];
  const snap = view === "snapshot";

  return (
    <DiagramShell
      title="Couches de virtualisation : machine physique, hyperviseurs de type 1 et 2, conteneurs, et snapshot comme point dans le temps"
      controls={
        <div>
          <ChoiceGroup label="Choisissez une architecture" options={ORDER.map((id) => ({ id, label: INFO[id].label }))} value={view} onChange={setView} />
          <InfoPanel title={info ? info.title : "Du matériel aux applications"}>
            {info ? (
              <>
                <p>{info.text}</p>
                <p>
                  <span className="font-medium text-ink">Exemples : </span>
                  {info.examples}
                </p>
              </>
            ) : (
              <p>
                Chaque colonne se lit de bas en haut : le matériel, puis ce qui le partage. Plus il y a de couches, plus on isole, au prix d&apos;un peu
                de performance. Choisissez une architecture ou le snapshot pour le détail.
              </p>
            )}
          </InfoPanel>
        </div>
      }
    >
      <svg viewBox="0 0 520 352" className="h-auto w-full" aria-hidden="true">
        {headers.map((h, i) => {
          const on = view === h.id;
          return (
            <g key={h.id} opacity={dim(h.id) ? 0.4 : 1} className="motion-safe:transition-opacity motion-safe:duration-300">
              <text x={colX(i) + COL_W / 2} y={20} textAnchor="middle" fontSize={13} fontWeight={600} fill={on ? "var(--signal)" : "var(--ink)"}>
                {h.title}
              </text>
              <text x={colX(i) + COL_W / 2} y={36} textAnchor="middle" fontSize={12} fill="var(--muted)">
                {h.sub}
              </text>
              {on ? <rect x={colX(i) - 4} y={48} width={COL_W + 8} height={212} rx={10} fill="none" stroke="var(--signal)" strokeWidth={1.5} /> : null}
            </g>
          );
        })}

        {/* Physique */}
        <g opacity={dim("physical") ? 0.4 : 1}>
          <Layer col={0} level={0} label="Matériel" on={view === "physical"} />
          <Layer col={0} level={1} label="Windows 11" on={view === "physical"} accent />
          <Layer col={0} level={2} label="Applications" on={view === "physical"} />
        </g>

        {/* Type 1 */}
        <g opacity={dim("type1") ? 0.4 : 1}>
          <Layer col={1} level={0} label="Matériel" on={view === "type1"} />
          <Layer col={1} level={1} label="Hyperviseur" on={view === "type1"} accent />
          {[0, 1].map((k) => (
            <g key={k}>
              <Layer col={1} level={3} label="" on={view === "type1" || snap} dx={k * 60} w={56} h={92} y={L(3) - 24} dashed accent={snap && k === 0} />
              <text x={colX(1) + k * 60 + 28} y={L(3) - 9} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">
                {`VM ${k + 1}`}
              </text>
              <Layer col={1} level={3} label="App" on={view === "type1"} dx={k * 60 + 4} w={48} h={26} y={L(3) + 2} />
              <Layer col={1} level={2} label="OS" on={view === "type1"} dx={k * 60 + 4} w={48} h={26} y={L(2) + 2} />
            </g>
          ))}
        </g>

        {/* Type 2 */}
        <g opacity={dim("type2") ? 0.4 : 1}>
          <Layer col={2} level={0} label="Matériel" on={view === "type2"} />
          <Layer col={2} level={1} label="OS hôte" on={view === "type2"} />
          <Layer col={2} level={2} label="VirtualBox" on={view === "type2"} accent />
          <Layer col={2} level={3} label="" on={view === "type2"} dx={0} w={COL_W} h={92} y={L(4) - 24} dashed />
          <text x={colX(2) + COL_W / 2} y={L(4) - 9} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">
            VM
          </text>
          <Layer col={2} level={4} label="App" on={view === "type2"} dx={4} w={COL_W - 8} h={26} y={L(4) + 2} />
          <Layer col={2} level={3} label="OS invité" on={view === "type2"} dx={4} w={COL_W - 8} h={26} y={L(3) + 2} />
        </g>

        {/* Conteneurs */}
        <g opacity={dim("containers") ? 0.4 : 1}>
          <Layer col={3} level={0} label="Matériel" on={view === "containers"} />
          <Layer col={3} level={1} label="OS et noyau" on={view === "containers"} accent />
          <Layer col={3} level={2} label="Moteur Docker" on={view === "containers"} />
          {[0, 1, 2].map((k) => (
            <g key={k}>
              <Layer col={3} level={3} label="" on={view === "containers"} dx={k * 40} w={36} h={64} y={L(3) - 32} />
              <text x={colX(3) + k * 40 + 18} y={L(3) - 10} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">
                App
              </text>
              <text x={colX(3) + k * 40 + 18} y={L(3) + 12} textAnchor="middle" fontSize={12} fill="var(--muted)">
                libs
              </text>
            </g>
          ))}
        </g>

        {/* Snapshot */}
        <g opacity={view !== null && !snap ? 0.45 : 1} className="motion-safe:transition-opacity motion-safe:duration-300">
          <Label x={12} y={282} anchor="start" weight={600} color={snap ? "var(--signal)" : "var(--ink-2)"}>
            Snapshot de la VM 1
          </Label>
          <line x1={20} y1={318} x2={500} y2={318} stroke="var(--line-strong)" strokeWidth={1.5} />
          <motion.rect
            key={snap ? "on" : "off"}
            x={170}
            y={310}
            height={16}
            rx={4}
            fill={snap ? "var(--signal-wash)" : "var(--mist)"}
            stroke={snap ? "var(--signal)" : "var(--line)"}
            initial={snap && !reduced ? { width: 0 } : false}
            animate={{ width: 320 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <text x={330} y={322} textAnchor="middle" fontSize={12} fill="var(--ink-2)">
            différences enregistrées depuis
          </text>
          <circle cx={170} cy={318} r={7} fill={snap ? "var(--signal)" : "var(--ink-2)"} />
          <Label x={170} y={302} weight={600} color="var(--ink)">
            Snapshot, lundi 14 h
          </Label>
          <Label x={170} y={344}>
            point dans le temps
          </Label>
          <Label x={500} y={302} anchor="end">
            maintenant
          </Label>
          <Label x={500} y={344} anchor="end" color="var(--danger)" weight={600}>
            même stockage : pas une sauvegarde
          </Label>
        </g>
      </svg>
    </DiagramShell>
  );
}
