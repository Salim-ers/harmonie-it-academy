"use client";

import { useState } from "react";
import { useSteps, type DiagramStep } from "./frame";
import { Appear, Arrow, Box, ChoiceGroup, DiagramShell, Facts, Label, MONO } from "./shared";

type AccountId = "local" | "domain" | "entra";
const ACCOUNTS: Record<AccountId, { type: string; identity: string; managed: string; sid: string; user: string; whoami: string }> = {
  local: {
    type: "Compte local",
    identity: "PC-CPT-014\\accueil",
    managed: "dans la base de comptes du poste lui-même (SAM)",
    sid: "S-1-5-21-…-1001",
    user: "accueil",
    whoami: "pc-cpt-014\\accueil",
  },
  domain: {
    type: "Compte de domaine",
    identity: "VALMONT\\c.moreau",
    managed: "par les contrôleurs de domaine de valmont.local (Active Directory)",
    sid: "S-1-5-21-…-1104",
    user: "c.moreau",
    whoami: "valmont\\c.moreau",
  },
  entra: {
    type: "Compte Entra ID",
    identity: "c.moreau@valmont.fr",
    managed: "dans Microsoft Entra ID, l'annuaire cloud de Microsoft 365",
    sid: "S-1-12-1-…",
    user: "c.moreau",
    whoami: "azuread\\clairemoreau",
  },
};

const STEPS: DiagramStep[] = [
  {
    title: "Le compte s'authentifie",
    description:
      "Selon son type, le compte est vérifié par le poste lui-même, par un contrôleur de domaine ou par Microsoft Entra ID. Chaque compte est identifié par un SID, un identifiant unique.",
  },
  {
    title: "Windows cherche le profil associé",
    description:
      "Dans le registre, la clé ProfileList associe chaque SID à un dossier de profil. À la toute première connexion, ce dossier n'existe pas : Windows le crée.",
  },
  {
    title: "Le profil est chargé",
    description:
      "Windows ouvre le dossier C:\\Users\\<nom> : Bureau, Documents, Téléchargements (souvent synchronisés par OneDrive), AppData pour les réglages et caches des applications, et NTUSER.DAT, le registre de l'utilisateur, chargé comme HKEY_CURRENT_USER.",
  },
  {
    title: "La session est ouverte",
    description: "Le bureau s'affiche avec les fichiers, le fond d'écran, les signatures Outlook et les préférences de l'utilisateur.",
  },
  {
    title: "Cas du profil temporaire",
    description:
      "Si Windows ne peut pas charger le profil (NTUSER.DAT verrouillé par un logiciel, disque plein, profil endommagé, entrée .bak en double dans ProfileList), il ouvre une session dans un profil vide, C:\\Users\\TEMP. Tout ce qui y est enregistré disparaît à la déconnexion. Le vrai profil est intact : on fait enregistrer le travail ailleurs et on escalade, sans rien supprimer.",
  },
];

const ROWS = [
  { name: "Bureau", note: "souvent OneDrive", file: false },
  { name: "Documents", note: "souvent OneDrive", file: false },
  { name: "Téléchargements", note: "", file: false },
  { name: "AppData\\Local", note: "caches, Teams", file: false },
  { name: "AppData\\Roaming", note: "réglages, signatures", file: false },
  { name: "NTUSER.DAT", note: "registre de l'utilisateur", file: true },
];

function Folder({ x, y, color, file }: { x: number; y: number; color: string; file: boolean }) {
  if (file) {
    return <path d={`M${x} ${y - 7} h8 l4 4 v10 h-12 z`} fill="none" stroke={color} strokeWidth={1.25} />;
  }
  return <path d={`M${x - 1} ${y - 5} h5 l2 2 h7 v9 h-14 z`} fill="none" stroke={color} strokeWidth={1.25} />;
}

export default function WindowsProfileDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const [acc, setAcc] = useState<AccountId>("domain");
  const a = ACCOUNTS[acc];
  const temp = step === 4;
  const loaded = step >= 2 && !temp;
  const folder = temp ? "C:\\Users\\TEMP" : `C:\\Users\\${a.user}`;

  return (
    <DiagramShell
      title="Du compte au profil Windows puis à la session, et le cas du profil temporaire"
      steps={STEPS}
      state={s}
      controls={
        <div>
          <ChoiceGroup
            label="Type de compte"
            options={(Object.keys(ACCOUNTS) as AccountId[]).map((id) => ({ id, label: ACCOUNTS[id].type }))}
            value={acc}
            onChange={setAcc}
          />
          <div aria-live="polite" className="mt-3 rounded-[var(--radius-control)] bg-mist px-3 py-2.5 text-sm text-ink-2">
            <Facts
              items={[
                { term: "Identité", value: a.identity, mono: true },
                { term: "Géré", value: a.managed },
                { term: "whoami affiche", value: a.whoami, mono: true },
                { term: "SID", value: a.sid, mono: true },
                { term: "Profil", value: `C:\\Users\\${a.user}`, mono: true },
              ]}
            />
          </div>
        </div>
      }
    >
      <svg viewBox="0 0 520 312" className="h-auto w-full" aria-hidden="true">
        <Box x={82} y={52} w={152} h={56} label={a.type} sub={a.identity} monoSub active={step === 0} wash={step === 0} />
        <Arrow from={{ x: 82, y: 82 }} to={{ x: 82, y: 126 }} color={step === 1 ? "var(--signal)" : "var(--line-strong)"} />
        <Box
          x={82}
          y={156}
          w={152}
          h={56}
          label="ProfileList"
          monoLabel
          sub={a.sid}
          monoSub
          active={step === 1}
          wash={step === 1 || temp}
          tone={temp ? "danger" : "default"}
        />
        <Label x={82} y={198}>
          registre : SID et chemin
        </Label>
        <Arrow from={{ x: 160, y: 156 }} to={{ x: 198, y: 156 }} color={step === 2 ? "var(--signal)" : temp ? "var(--danger)" : "var(--line-strong)"} />
        <Arrow from={{ x: 198, y: 262 }} to={{ x: 160, y: 262 }} color={step === 3 ? "var(--signal)" : "var(--line-strong)"} />
        <Box
          x={82}
          y={262}
          w={152}
          h={56}
          label="Session"
          sub={temp ? "profil temporaire" : step >= 3 ? "bureau prêt" : "en attente"}
          active={step === 3}
          wash={step >= 3}
          tone={temp ? "danger" : step === 3 ? "ok" : "default"}
        />

        {/* Dossier de profil */}
        <rect
          x={200}
          y={16}
          width={310}
          height={284}
          rx={10}
          fill={temp ? "var(--danger-wash)" : step === 2 ? "var(--signal-wash)" : "var(--surface)"}
          stroke={temp ? "var(--danger)" : step === 2 ? "var(--signal)" : "var(--line-strong)"}
          strokeWidth={step === 2 || temp ? 2 : 1.25}
        />
        <Appear key={folder} reduced={reduced} dy={0}>
          <text x={218} y={44} fontSize={13} fontWeight={600} fill={temp ? "var(--danger)" : "var(--ink)"} fontFamily={MONO}>
            {folder}
          </text>
        </Appear>
        <line x1={214} y1={56} x2={496} y2={56} stroke="var(--line)" />
        {ROWS.map((r, i) => {
          const y = 80 + i * 30;
          const color = temp ? "var(--muted)" : r.file && step === 2 ? "var(--signal)" : loaded ? "var(--ink-2)" : "var(--muted)";
          return (
            <g key={r.name} opacity={temp ? 0.5 : loaded ? 1 : 0.4}>
              {loaded ? (
                <Appear key={`${r.name}-${acc}`} reduced={reduced} delay={step === 2 ? i * 0.12 : 0} dy={0} dx={-4}>
                  <Folder x={220} y={y} color={color} file={r.file} />
                  <text x={242} y={y + 4} fontSize={12} fill={color} fontFamily={MONO} fontWeight={r.file && step === 2 ? 600 : undefined}>
                    {r.name}
                  </text>
                  {r.note ? (
                    <Label x={496} y={y + 4} anchor="end">
                      {r.note}
                    </Label>
                  ) : null}
                </Appear>
              ) : (
                <g>
                  <Folder x={220} y={y} color={color} file={r.file} />
                  <text x={242} y={y + 4} fontSize={12} fill={color} fontFamily={MONO}>
                    {r.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {temp ? (
          <Appear reduced={reduced} delay={0.4}>
            <text x={218} y={268} fontSize={12} fontWeight={600} fill="var(--danger)">
              Vide, supprimé à la déconnexion
            </text>
            <text x={218} y={286} fontSize={12} fill="var(--ink-2)">
              {`Le vrai profil C:\\Users\\${a.user} reste intact`}
            </text>
          </Appear>
        ) : step === 2 ? (
          <Appear reduced={reduced} delay={0.8}>
            <text x={218} y={276} fontSize={12} fill="var(--signal)">
              NTUSER.DAT devient HKEY_CURRENT_USER
            </text>
          </Appear>
        ) : null}
      </svg>
    </DiagramShell>
  );
}
