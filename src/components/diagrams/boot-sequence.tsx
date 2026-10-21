"use client";

import { motion } from "motion/react";
import { useSteps, type DiagramStep } from "./frame";
import { Appear, DiagramShell, Label, MONO, Mark } from "./shared";

type BootStep = DiagramStep & { label: string; blocked: string };

const STEPS: BootStep[] = [
  {
    label: "Mise sous tension",
    title: "Mise sous tension",
    description: "L'alimentation fournit le courant ; la carte mère réveille le processeur, qui lance le firmware UEFI stocké sur la carte mère.",
    blocked: "Rien du tout : aucun voyant, aucun ventilateur. Vérifiez la prise, la multiprise, l'interrupteur à l'arrière, ou le chargeur sur un portable.",
  },
  {
    label: "POST",
    title: "POST (Power-On Self-Test)",
    description: "Le firmware vérifie le processeur, la mémoire, la carte graphique et le clavier avant d'aller plus loin.",
    blocked: "Des bips ou un voyant qui clignote selon un code, sans aucune image. Notez la séquence : elle désigne souvent la mémoire ou la carte graphique. Escaladez.",
  },
  {
    label: "UEFI et Secure Boot",
    title: "Firmware UEFI et Secure Boot",
    description:
      "L'UEFI lit l'ordre de démarrage et trouve la partition système EFI du disque. Secure Boot vérifie que le chargeur de démarrage est signé par un éditeur de confiance.",
    blocked: "Le logo reste affiché, ou un message « aucun périphérique de démarrage » (disque absent, clé USB prioritaire), ou une violation Secure Boot (média non signé).",
  },
  {
    label: "Gestionnaire de démarrage",
    title: "Gestionnaire de démarrage Windows",
    description:
      "Le fichier \\EFI\\Microsoft\\Boot\\bootmgfw.efi lit la configuration de démarrage (BCD) et lance winload.efi. Le TPM permet à BitLocker de déverrouiller le disque si rien n'a changé.",
    blocked:
      "Un écran bleu « Récupération » indiquant un fichier de configuration de démarrage manquant ou endommagé, ou l'écran de récupération BitLocker qui demande la clé.",
  },
  {
    label: "Noyau Windows",
    title: "Chargement du noyau",
    description: "winload.efi charge le noyau (ntoskrnl.exe) et les pilotes indispensables au démarrage. Le noyau prend alors la main sur le matériel.",
    blocked: "Un écran bleu d'arrêt avec un code, par exemple INACCESSIBLE_BOOT_DEVICE, ou une boucle « Réparation automatique ».",
  },
  {
    label: "Services",
    title: "Démarrage des services",
    description: "Le gestionnaire de services lance les services en démarrage automatique : client DHCP, client DNS, spouleur, stratégies de groupe…",
    blocked:
      "Un écran « Veuillez patienter » qui dure, souvent un service ou une stratégie de groupe qui attend le réseau. L'Observateur d'événements dira lequel (source Service Control Manager).",
  },
  {
    label: "Ouverture de session",
    title: "Ouverture de session",
    description: "L'utilisateur saisit ses identifiants. Un contrôleur de domaine les vérifie (ou le cache du poste hors réseau), puis Windows charge son profil et affiche le bureau.",
    blocked:
      "« Nom d'utilisateur ou mot de passe incorrect », « la relation d'approbation entre cette station de travail et le domaine principal a échoué », ou une session ouverte avec un profil temporaire.",
  },
];

const ROW_Y = (i: number) => 30 + i * 42;
const SX = 246;
const SY = 34;
const SW = 248;
const SH = 168;
const SCX = SX + SW / 2;

function Screen({ step, reduced }: { step: number; reduced: boolean }) {
  const fg = "var(--term-fg)";
  const dim = "var(--term-dim)";
  const ok = "var(--term-ok)";
  switch (step) {
    case 0:
      return (
        <g stroke={dim} strokeWidth={2} fill="none" strokeLinecap="round">
          <path d={`M${SCX - 9} ${SY + 74} A 16 16 0 1 0 ${SCX + 9} ${SY + 74}`} />
          <line x1={SCX} y1={SY + 64} x2={SCX} y2={SY + 82} />
        </g>
      );
    case 1:
      return (
        <g>
          <text x={SX + 20} y={SY + 36} fontSize={12} fill={dim}>
            Vérification du matériel
          </text>
          {["CPU", "Mémoire", "Graphique", "Clavier"].map((c, i) => (
            <Appear key={c} reduced={reduced} delay={i * 0.25} dy={0}>
              <text x={SX + 20} y={SY + 64 + i * 22} fontSize={12} fill={fg} fontFamily={MONO}>
                {c}
              </text>
              <text x={SX + 132} y={SY + 64 + i * 22} fontSize={12} fill={ok} fontFamily={MONO}>
                OK
              </text>
            </Appear>
          ))}
        </g>
      );
    case 2:
      return (
        <g>
          <rect x={SCX - 70} y={SY + 38} width={140} height={52} rx={8} fill="none" stroke={dim} />
          <text x={SCX} y={SY + 69} textAnchor="middle" fontSize={13} fill={fg}>
            Logo du fabricant
          </text>
          <Appear reduced={reduced} delay={0.5}>
            <text x={SCX} y={SY + 128} textAnchor="middle" fontSize={12} fill={ok}>
              Secure Boot : signature valide
            </text>
          </Appear>
        </g>
      );
    case 3:
      return (
        <g>
          <text x={SCX} y={SY + 60} textAnchor="middle" fontSize={12} fill={fg} fontFamily={MONO}>
            \EFI\Microsoft\Boot\bootmgfw.efi
          </text>
          <Appear reduced={reduced} delay={0.3}>
            <text x={SCX} y={SY + 88} textAnchor="middle" fontSize={12} fill={dim}>
              lit le BCD, lance winload.efi
            </text>
          </Appear>
          <Appear reduced={reduced} delay={0.7}>
            <text x={SCX} y={SY + 120} textAnchor="middle" fontSize={12} fill={ok}>
              TPM : disque BitLocker déverrouillé
            </text>
          </Appear>
        </g>
      );
    case 4:
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={SCX - 17 + (i % 2) * 18} y={SY + 34 + Math.floor(i / 2) * 18} width={16} height={16} rx={1} fill={fg} opacity={0.85} />
          ))}
          <motion.g
            style={{ transformOrigin: `${SCX}px ${SY + 112}px` }}
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{ duration: 1.6, ease: "linear", repeat: 1 }}
          >
            {Array.from({ length: 6 }, (_, i) => {
              const a = (i / 6) * Math.PI * 2;
              return <circle key={i} cx={SCX + Math.cos(a) * 12} cy={SY + 112 + Math.sin(a) * 12} r={2.4} fill={fg} opacity={0.3 + i * 0.12} />;
            })}
          </motion.g>
          <text x={SCX} y={SY + 150} textAnchor="middle" fontSize={12} fill={dim} fontFamily={MONO}>
            ntoskrnl.exe et pilotes
          </text>
        </g>
      );
    case 5:
      return (
        <g>
          <text x={SX + 20} y={SY + 32} fontSize={12} fill={dim}>
            Services en démarrage automatique
          </text>
          {["Dhcp", "Dnscache", "Spooler", "gpsvc"].map((c, i) => (
            <Appear key={c} reduced={reduced} delay={i * 0.25} dy={0}>
              <text x={SX + 20} y={SY + 60 + i * 24} fontSize={12} fill={fg} fontFamily={MONO}>
                {c}
              </text>
              <text x={SX + 120} y={SY + 60 + i * 24} fontSize={12} fill={ok}>
                démarré
              </text>
            </Appear>
          ))}
        </g>
      );
    default:
      return (
        <g>
          <circle cx={SCX} cy={SY + 46} r={18} fill="none" stroke={fg} strokeWidth={1.5} />
          <circle cx={SCX} cy={SY + 41} r={6} fill={fg} />
          <path d={`M${SCX - 11} ${SY + 58} Q${SCX} ${SY + 48} ${SCX + 11} ${SY + 58}`} fill={fg} />
          <text x={SCX} y={SY + 86} textAnchor="middle" fontSize={12} fill={fg} fontFamily={MONO}>
            VALMONT\c.moreau
          </text>
          <rect x={SCX - 70} y={SY + 98} width={140} height={24} rx={5} fill="none" stroke={dim} />
          <text x={SCX - 60} y={SY + 114} fontSize={12} fill={fg} fontFamily={MONO}>
            ••••••••••
          </text>
          <Appear reduced={reduced} delay={0.6}>
            <text x={SCX} y={SY + 148} textAnchor="middle" fontSize={12} fill={ok}>
              Profil chargé, bureau prêt
            </text>
          </Appear>
        </g>
      );
  }
}

export default function BootSequenceDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const cur = STEPS[step];
  const barX = 236;
  const barW = 268;
  const seg = barW / STEPS.length;
  return (
    <DiagramShell
      title="Séquence de démarrage d'un poste Windows, de la mise sous tension à l'ouverture de session"
      steps={STEPS}
      state={s}
      stepExtra={
        <p className="rounded-[var(--radius-control)] border-l-2 border-danger bg-danger-wash px-3 py-2 text-ink-2">
          <span className="font-medium text-ink">Si ça bloque ici, vous voyez : </span>
          {cur.blocked}
        </p>
      }
    >
      <svg viewBox="0 0 520 330" className="h-auto w-full" aria-hidden="true">
        {STEPS.map((st, i) => {
          const y = ROW_Y(i);
          const on = i === step;
          const kind = i < step ? "ok" : on ? "current" : "pending";
          return (
            <g key={st.label}>
              {i < STEPS.length - 1 ? <line x1={26} y1={y + 9} x2={26} y2={ROW_Y(i + 1) - 9} stroke={i < step ? "var(--ok)" : "var(--line-strong)"} strokeWidth={1.5} /> : null}
              <rect x={10} y={y - 17} width={220} height={34} rx={8} fill={on ? "var(--signal-wash)" : "var(--surface)"} stroke={on ? "var(--signal)" : "var(--line-strong)"} strokeWidth={on ? 2 : 1.25} />
              <Mark x={26} y={y} kind={kind} />
              <text x={40} y={y + 4.5} fontSize={13} fontWeight={on ? 600 : 500} fill={i > step ? "var(--muted)" : "var(--ink)"}>
                {st.label}
              </text>
            </g>
          );
        })}

        {/* Écran */}
        <rect x={236} y={24} width={268} height={190} rx={10} fill="var(--mist)" stroke="var(--line-strong)" />
        <rect x={SX} y={SY} width={SW} height={SH} rx={4} fill="var(--term-bg)" />
        <circle cx={494} cy={208} r={3} fill="var(--ok)" />
        <rect x={358} y={214} width={24} height={14} fill="var(--mist)" stroke="var(--line-strong)" />
        <rect x={326} y={228} width={88} height={8} rx={3} fill="var(--mist)" stroke="var(--line-strong)" />
        <g key={step}>
          <Screen step={step} reduced={reduced} />
        </g>

        {/* Qui a la main : firmware puis Windows */}
        <rect x={barX} y={262} width={seg * 3 - 2} height={16} rx={5} fill={step <= 2 ? "var(--signal-wash)" : "var(--mist)"} stroke="var(--line-strong)" />
        <rect x={barX + seg * 3 + 2} y={262} width={seg * 4 - 2} height={16} rx={5} fill={step >= 3 ? "var(--signal-wash)" : "var(--mist)"} stroke="var(--line-strong)" />
        <Label x={barX + (seg * 3) / 2} y={298}>
          Firmware UEFI
        </Label>
        <Label x={barX + seg * 3 + seg * 2} y={298}>
          Windows (disque)
        </Label>
        <motion.g initial={false} animate={{ x: barX + seg * step + seg / 2 }} transition={{ duration: reduced ? 0 : 0.5 }}>
          <polygon points="0,258 -6,250 6,250" fill="var(--signal)" />
        </motion.g>
      </svg>
    </DiagramShell>
  );
}
