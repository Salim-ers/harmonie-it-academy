"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { useSteps, type DiagramStep } from "./frame";
import { ChoiceGroup, DiagramShell, InfoPanel, Label, MONO } from "./shared";

type PartId = "efi" | "msr" | "c" | "recovery";

const PARTS: Record<PartId, { label: string; size: string; x: number; w: number; title: string; text: string }> = {
  efi: {
    label: "EFI",
    size: "100 Mo",
    x: 20,
    w: 64,
    title: "Partition système EFI (FAT32, environ 100 Mo)",
    text: "Elle contient le gestionnaire de démarrage de Windows (\\EFI\\Microsoft\\Boot\\bootmgfw.efi) et la configuration de démarrage (BCD). Le firmware UEFI la lit à chaque allumage. Elle n'a pas de lettre : on n'y touche jamais.",
  },
  msr: {
    label: "MSR",
    size: "16 Mo",
    x: 88,
    w: 52,
    title: "Partition réservée Microsoft (MSR, 16 Mo)",
    text: "Un petit espace réservé par Windows pour la gestion des disques GPT. Elle ne contient pas de fichiers et n'apparaît pas dans la Gestion des disques ; la commande diskpart la montre.",
  },
  c: {
    label: "C:",
    size: "NTFS, 237 Go",
    x: 144,
    w: 266,
    title: "Partition Windows C: (NTFS, environ 237 Go)",
    text: "Windows, les programmes, les profils des utilisateurs (C:\\Users), le fichier d'échange pagefile.sys et, si l'hibernation est active, hiberfil.sys. C'est la seule partition que l'utilisateur voit.",
  },
  recovery: {
    label: "Récupération",
    size: "750 Mo",
    x: 414,
    w: 86,
    title: "Partition de récupération (environ 750 Mo)",
    text: "Elle contient l'environnement de récupération Windows (WinRE), utilisé par la « Réparation automatique » et la réinitialisation du poste. Sans lettre. Si elle est trop petite, certaines mises à jour de WinRE échouent.",
  },
};
const PART_ORDER: PartId[] = ["efi", "msr", "c", "recovery"];

const CAPACITY = 237;
const USES = [
  { label: "Windows", size: 28 },
  { label: "Applications", size: 32 },
  { label: "Fichiers synchronisés", size: 110 },
  { label: "Téléchargements", size: 45 },
  { label: "Mises à jour et temporaires", size: 18 },
];

const STEPS: DiagramStep[] = [
  {
    title: "Après l'installation",
    description: "Windows occupe environ 28 Go sur les 237 Go de C:. Le disque est un SSD NVMe de 256 Go, que Windows affiche comme 238,4 Go (il compte en puissances de 1 024).",
  },
  {
    title: "Les applications",
    description: "Office, Teams, le navigateur et les logiciels métier ajoutent environ 32 Go. Le poste reste très à l'aise.",
  },
  {
    title: "Les fichiers synchronisés",
    description:
      "Des bibliothèques SharePoint synchronisées et des dossiers OneDrive marqués « Toujours conserver sur cet appareil » rapatrient 110 Go de fichiers en local. C'est souvent la première cause de disque plein.",
  },
  {
    title: "Les téléchargements",
    description: "Le dossier Téléchargements accumule images ISO, vidéos et pièces jointes en double : 45 Go que personne ne regarde.",
  },
  {
    title: "Les mises à jour et fichiers temporaires",
    description:
      "Cache des mises à jour Windows, ancienne installation (Windows.old) après une mise à niveau, fichiers temporaires : encore 18 Go. Il ne reste que 4 Go libres : le poste ralentit et les mises à jour échouent. On libère de l'espace avec les outils prévus (Stockage, nettoyage de disque, fichiers à la demande OneDrive), jamais en supprimant des dossiers système à la main.",
  },
];

const BAR_X = 20;
const BAR_W = 480;
const scale = (go: number) => (go / CAPACITY) * BAR_W;

/** Segments de la barre d'occupation : position cumulée de chaque cause. */
const SEGS = USES.map((u, i) => ({
  ...u,
  i,
  x: BAR_X + scale(USES.slice(0, i).reduce((a, v) => a + v.size, 0)),
  w: scale(u.size),
}));

export default function DiskLayoutDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const [part, setPart] = useState<PartId | null>(null);
  const clipId = `disk-c-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const used = USES.slice(0, step + 1).reduce((a, u) => a + u.size, 0);
  const free = CAPACITY - used;
  const pct = Math.round((used / CAPACITY) * 100);
  const critical = pct >= 90;
  const info = part ? PARTS[part] : null;

  const segs = SEGS;

  return (
    <DiagramShell
      title="Disque GPT : partition EFI, MSR, C: en NTFS et récupération, puis remplissage de C: et ses causes fréquentes"
      steps={STEPS}
      state={s}
      controls={
        <div>
          <ChoiceGroup label="Choisissez une partition" options={PART_ORDER.map((id) => ({ id, label: PARTS[id].label }))} value={part} onChange={setPart} />
          <InfoPanel title={info ? info.title : "Quatre partitions sur un disque GPT"}>
            <p>
              {info
                ? info.text
                : "Un poste UEFI récent a toujours ce découpage : EFI, MSR, C: et récupération. Les tailles du schéma ne sont pas à l'échelle : EFI et MSR sont minuscules à côté de C:."}
            </p>
          </InfoPanel>
        </div>
      }
    >
      <svg viewBox="0 0 520 300" className="h-auto w-full" aria-hidden="true">
        <Label x={20} y={20} anchor="start" weight={600} color="var(--ink-2)" size={13}>
          Disque 0, GPT, SSD NVMe de 256 Go
        </Label>
        {PART_ORDER.map((id) => {
          const p = PARTS[id];
          const on = part === id;
          const isC = id === "c";
          return (
            <g key={id}>
              <rect
                x={p.x}
                y={32}
                width={p.w}
                height={52}
                rx={8}
                fill={on ? "var(--signal-wash)" : isC ? "var(--surface)" : "var(--mist)"}
                stroke={on ? "var(--signal)" : isC && critical ? "var(--danger)" : "var(--line-strong)"}
                strokeWidth={on || (isC && critical) ? 2 : 1.25}
              />
              <text x={p.x + p.w / 2} y={54} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)" fontFamily={isC ? MONO : undefined}>
                {p.label}
              </text>
              <text x={p.x + p.w / 2} y={72} textAnchor="middle" fontSize={12} fill="var(--muted)">
                {p.size}
              </text>
            </g>
          );
        })}
        {/* Zoom sur C: */}
        <path d={`M144 86 L${BAR_X} 128 M410 86 L${BAR_X + BAR_W} 128`} stroke="var(--line)" strokeDasharray="3 3" fill="none" />

        <Label x={BAR_X} y={122} anchor="start" weight={600} color="var(--ink-2)">
          Occupation de C:
        </Label>
        <text x={BAR_X + BAR_W} y={122} textAnchor="end" fontSize={12} fontFamily={MONO} fill={critical ? "var(--danger)" : "var(--ink-2)"} fontWeight={critical ? 600 : undefined}>
          {`${used} Go utilisés sur ${CAPACITY} (${pct} %), ${free} Go libres`}
        </text>
        <rect x={BAR_X} y={132} width={BAR_W} height={34} rx={8} fill="var(--mist)" stroke={critical ? "var(--danger)" : "var(--line-strong)"} strokeWidth={critical ? 2 : 1.25} />
        <clipPath id={clipId}>
          <rect x={BAR_X} y={132} width={BAR_W} height={34} rx={8} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          {segs.map((sg) =>
            sg.i <= step ? (
              <motion.rect
                key={sg.label}
                x={sg.x}
                y={132}
                height={34}
                fill={sg.i === step ? (critical ? "var(--danger)" : "var(--signal)") : "var(--line-strong)"}
                initial={reduced || sg.i < step ? false : { width: 0 }}
                animate={{ width: Math.max(0, sg.w - 1.5) }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            ) : null,
          )}
        </g>

        {/* Légende des causes */}
        {segs.map((sg) => {
          const col = sg.i < 3 ? 0 : 1;
          const row = sg.i < 3 ? sg.i : sg.i - 3;
          const x = 20 + col * 250;
          const y = 196 + row * 26;
          const shown = sg.i <= step;
          const current = sg.i === step;
          return (
            <g key={sg.label} opacity={shown ? 1 : 0.35}>
              <rect x={x} y={y - 10} width={12} height={12} rx={3} fill={current ? (critical ? "var(--danger)" : "var(--signal)") : shown ? "var(--line-strong)" : "var(--mist)"} stroke="var(--line-strong)" />
              <text x={x + 20} y={y} fontSize={12} fill="var(--ink)" fontWeight={current ? 600 : undefined}>
                {sg.label}
              </text>
              <text x={x + 230} y={y} textAnchor="end" fontSize={12} fill="var(--muted)" fontFamily={MONO}>
                {`${sg.size} Go`}
              </text>
            </g>
          );
        })}
      </svg>
    </DiagramShell>
  );
}
