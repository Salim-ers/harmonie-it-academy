"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Arrow, Box, DiagramShell, Label, Token, type Pt } from "./shared";

const STEPS: DiagramStep[] = [
  {
    title: "Le compte naît dans Active Directory",
    description:
      "Le service RH fait créer le compte c.moreau dans l'OU Utilisateurs du domaine valmont.local, avec l'identifiant de connexion (UPN) c.moreau@valmont.fr.",
  },
  {
    title: "Synchronisation vers Microsoft Entra ID",
    description:
      "Microsoft Entra Connect, installé sur un serveur de l'entreprise, recopie le compte vers Entra ID, souvent avec une empreinte du mot de passe. Le cycle par défaut dure environ 30 minutes : un compte tout juste créé n'apparaît pas tout de suite dans le cloud.",
  },
  {
    title: "Licence attribuée par un groupe",
    description:
      "Le compte est ajouté au groupe LIC_M365_Standard : la licence lui est attribuée automatiquement. Elle débloque Exchange Online, Teams, OneDrive et SharePoint. Sans licence, l'utilisatrice se connecte mais ne voit pas ses services.",
  },
  {
    title: "Connexion de l'utilisatrice",
    description: "Le lundi, Mme Moreau ouvre Outlook et saisit c.moreau@valmont.fr puis son mot de passe. C'est Entra ID qui vérifie l'identité.",
  },
  {
    title: "Authentification multifacteur",
    description:
      "Entra ID demande une deuxième preuve : une notification dans Microsoft Authenticator, où elle saisit le nombre affiché à l'écran. Un mot de passe volé ne suffit donc pas. Une notification qu'elle n'a pas demandée ne doit jamais être approuvée.",
  },
  {
    title: "Jeton d'accès et services",
    description:
      "Identité vérifiée : Entra ID délivre un jeton. Chaque service autorisé par la licence l'accepte, sans redemander le mot de passe : Outlook, puis Teams, OneDrive et SharePoint s'ouvrent.",
  },
];

const AD = { x: 82, y: 60 };
const SYNC = { x: 82, y: 150 };
const USER = { x: 82, y: 268 };
const MFA = { x: 262, y: 40 };
const ENTRA = { x: 262, y: 130 };
const LIC = { x: 262, y: 228 };
const SERVICES = [
  { label: "Exchange Online", y: 64 },
  { label: "Teams", y: 132 },
  { label: "OneDrive", y: 200 },
  { label: "SharePoint", y: 268 },
];
const SX = 444;

function Tokens({ step, reduced }: { step: number; reduced: boolean }) {
  const p = (path: Pt[], label: string, o: { delay?: number; color?: string; duration?: number; mono?: boolean } = {}) => (
    <Token path={path} label={label} mono={o.mono} reduced={reduced} fade delay={o.delay ?? 0} duration={o.duration ?? 1} color={o.color} />
  );
  switch (step) {
    case 1:
      return p([AD, SYNC, ENTRA], "c.moreau", { mono: true, duration: 1.3 });
    case 2:
      return p([ENTRA, LIC], "membre", { duration: 0.9 });
    case 3:
      return p([USER, ENTRA], "mot de passe", { duration: 1 });
    case 4:
      return (
        <g>
          {p([ENTRA, MFA], "notification", { duration: 0.7 })}
          {p([MFA, ENTRA], "approuvée", { duration: 0.7, delay: 0.8, color: "var(--ok)" })}
        </g>
      );
    case 5:
      return (
        <g>
          {SERVICES.map((sv, i) => (
            <g key={sv.label}>{p([ENTRA, LIC, { x: SX, y: sv.y }], "jeton", { duration: 1.2, delay: i * 0.1, color: "var(--ok)" })}</g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

export default function M365IdentityDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const on = (k: number[]) => k.includes(step);
  const line = (k: number[]) => (on(k) ? "var(--signal)" : "var(--line-strong)");
  return (
    <DiagramShell title="Identité Microsoft 365 : Active Directory, synchronisation Entra Connect, Entra ID, groupe de licences, MFA et services" steps={STEPS} state={s}>
      <svg viewBox="0 0 520 300" className="h-auto w-full" aria-hidden="true">
        <Label x={82} y={16} weight={600} color="var(--ink-2)">
          Sur site
        </Label>
        <Label x={SX} y={16} weight={600} color="var(--ink-2)">
          Services Microsoft 365
        </Label>
        <line x1={168} y1={8} x2={168} y2={296} stroke="var(--line)" strokeDasharray="4 4" />
        <Label x={176} y={292} anchor="start">
          Cloud
        </Label>

        <Arrow from={{ x: 82, y: 86 }} to={{ x: 82, y: 124 }} color={line([1])} width={on([1]) ? 2 : 1.5} />
        <Arrow from={{ x: 154, y: 144 }} to={{ x: 185, y: 136 }} color={line([1])} width={on([1]) ? 2 : 1.5} />
        <Arrow from={{ x: 140, y: 244 }} to={{ x: 200, y: 158 }} color={line([3])} width={on([3]) ? 2 : 1.5} />
        <Arrow from={{ x: 262, y: 104 }} to={{ x: 262, y: 64 }} color={line([4])} tail width={on([4]) ? 2 : 1.5} />
        <Arrow from={{ x: 262, y: 158 }} to={{ x: 262, y: 202 }} color={line([2, 5])} width={on([2, 5]) ? 2 : 1.5} />
        {SERVICES.map((sv) => (
          <Arrow key={sv.label} from={{ x: 339, y: 228 }} to={{ x: SX - 72, y: sv.y }} color={step === 5 ? "var(--ok)" : step === 2 ? "var(--signal)" : "var(--line)"} />
        ))}

        <Box x={AD.x} y={AD.y} w={150} h={50} label="Active Directory" sub="valmont.local" monoSub active={on([0])} wash={on([0, 1])} />
        <Box x={SYNC.x} y={SYNC.y} w={150} h={50} label="Entra Connect" sub="synchronisation" active={on([1])} wash={on([1])} />
        <Box x={USER.x} y={USER.y} w={150} h={50} label="Utilisatrice" sub="c.moreau@valmont.fr" monoSub active={on([3])} wash={on([3, 5])} tone={step === 5 ? "ok" : "default"} />
        <Box x={MFA.x} y={MFA.y} w={150} h={44} label="MFA" sub="Authenticator" active={on([4])} wash={on([4])} />
        <Box x={ENTRA.x} y={ENTRA.y} w={150} h={52} label="Microsoft Entra ID" sub="annuaire cloud" active={on([1, 3, 4, 5])} wash={on([1, 3, 4, 5])} />
        <Box x={LIC.x} y={LIC.y} w={150} h={50} label="LIC_M365_Standard" monoLabel labelSize={12} sub="groupe de licences" active={on([2])} wash={on([2, 5])} />
        {SERVICES.map((sv) => (
          <Box key={sv.label} x={SX} y={sv.y} w={140} h={44} label={sv.label} tone={step === 5 ? "ok" : "default"} wash={step === 2 || step === 5} />
        ))}

        <g key={`tk-${step}`}>
          <Tokens step={step} reduced={reduced} />
        </g>
      </svg>
    </DiagramShell>
  );
}
