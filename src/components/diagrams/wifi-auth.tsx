"use client";

import { useSteps, type DiagramStep } from "./frame";
import { Appear, Arrow, Box, DiagramShell, Label, Token, type Pt } from "./shared";

const STEPS: DiagramStep[] = [
  {
    title: "Association au SSID VALMONT-CORP",
    description:
      "Le portable se connecte au SSID VALMONT-CORP, protégé en WPA2 ou WPA3-Entreprise. Tant qu'il n'est pas authentifié, la borne ne laisse passer que les messages d'authentification (EAP), rien d'autre.",
  },
  {
    title: "Le poste présente son identité",
    description:
      "La borne, pilotée par le contrôleur, demande l'identité du poste et la relaie au serveur RADIUS dans une demande d'accès (Access-Request). La borne ne décide de rien : elle transmet.",
  },
  {
    title: "Tunnel chiffré et preuve d'identité",
    description:
      "Le serveur RADIUS présente son certificat ; un tunnel chiffré s'établit. Le poste y prouve son identité : mot de passe du compte (méthode PEAP) ou certificat installé sur la machine (méthode EAP-TLS).",
  },
  {
    title: "Vérification dans l'annuaire",
    description:
      "Le serveur RADIUS (le rôle NPS sous Windows Server) interroge Active Directory : le compte existe-t-il, est-il actif, appartient-il au groupe autorisé par la stratégie réseau ?",
  },
  {
    title: "Décision : Access-Accept",
    description:
      "Tout est conforme : le serveur renvoie Access-Accept, avec parfois le VLAN à attribuer. En cas de refus, Access-Reject, et le poste reste dehors. Le journal du serveur RADIUS en donne la raison.",
  },
  {
    title: "Accès ouvert",
    description:
      "La borne et le poste dérivent des clés de chiffrement propres à cette session, puis le port s'ouvre. Le poste demande une adresse en DHCP et arrive sur le réseau des postes.",
  },
  {
    title: "À côté : le réseau invités",
    description:
      "La même borne diffuse aussi VALMONT-INVITES, relié à un réseau isolé. Un portail captif s'affiche à la première page web : conditions à accepter ou code du jour. Ensuite, Internet seulement, jamais les serveurs, postes ou imprimantes de l'entreprise.",
  },
];

const Y1 = 96;
const Y2 = 246;
const C = { x: 40, w: 70 };
const B = { x: 148, w: 116 };
const K = { x: 264, w: 88 };
const R = { x: 360, w: 80 };
const D = { x: 460, w: 96 };
const T = 54;
const P = { c: { x: C.x, y: T }, b: { x: B.x, y: T }, k: { x: K.x, y: T }, r: { x: R.x, y: T }, d: { x: D.x, y: T } };
const G = { c: { x: C.x, y: Y2 - 42 }, b: { x: B.x, y: Y2 - 42 }, k: { x: K.x, y: Y2 - 42 }, i: { x: D.x, y: Y2 - 42 } };

function Tokens({ step, reduced }: { step: number; reduced: boolean }) {
  const t = (path: Pt[], label: string, opts: { delay?: number; color?: string; duration?: number } = {}) => (
    <Token path={path} label={label} reduced={reduced} fade delay={opts.delay ?? 0} duration={opts.duration ?? 0.9} color={opts.color} />
  );
  switch (step) {
    case 0:
      return t([P.c, P.b], "EAP");
    case 1:
      return t([P.c, P.b, P.k, P.r], "identité", { duration: 1.3 });
    case 2:
      return (
        <g>
          {t([P.r, P.k, P.b, P.c], "certificat", { duration: 0.75, color: "var(--ink-2)" })}
          {t([P.c, P.b, P.k, P.r], "preuve", { duration: 0.75, delay: 0.8 })}
        </g>
      );
    case 3:
      return (
        <g>
          {t([P.r, P.d], "compte ?", { duration: 0.7 })}
          {t([P.d, P.r], "valide", { duration: 0.7, delay: 0.8, color: "var(--ok)" })}
        </g>
      );
    case 4:
      return t([P.r, P.k, P.b], "Access-Accept", { duration: 1.2, color: "var(--ok)" });
    case 5:
      return t([P.c, P.b, P.k], "DHCP", { duration: 1 });
    default:
      return (
        <g>
          {t([G.c, G.b, G.k], "code du jour", { duration: 0.8 })}
          {t([G.k, G.i], "Internet", { duration: 0.7, delay: 0.85, color: "var(--ok)" })}
        </g>
      );
  }
}

export default function WifiAuthDiagram() {
  const s = useSteps(STEPS.length);
  const { step, reduced } = s;
  const guest = step === 6;
  const corpOn = (min: number, max: number) => !guest && step >= min && step <= max;
  const link = (on: boolean) => (on ? "var(--signal)" : "var(--line-strong)");
  return (
    <DiagramShell title="Authentification Wi-Fi 802.1X sur VALMONT-CORP et réseau invités isolé avec portail captif" steps={STEPS} state={s}>
      <svg viewBox="0 0 520 300" className="h-auto w-full" aria-hidden="true">
        <Label x={16} y={22} anchor="start" weight={600} color="var(--ink-2)">
          Réseau d&apos;entreprise, 802.1X
        </Label>
        <g opacity={guest ? 0.45 : 1} className="motion-safe:transition-opacity motion-safe:duration-300">
          <Arrow from={{ x: 76, y: Y1 }} to={{ x: 89, y: Y1 }} color={link(corpOn(0, 5))} dashed />
          <Arrow from={{ x: 207, y: Y1 }} to={{ x: 219, y: Y1 }} color={link(corpOn(1, 2) || corpOn(4, 5))} tail />
          <Arrow from={{ x: 309, y: Y1 }} to={{ x: 319, y: Y1 }} color={link(corpOn(1, 2) || corpOn(4, 4))} tail />
          <Arrow from={{ x: 401, y: Y1 }} to={{ x: 411, y: Y1 }} color={link(corpOn(3, 3))} tail />
          <Box x={C.x} y={Y1} w={C.w} h={52} label="Poste" tone={!guest && step === 5 ? "ok" : "default"} wash={!guest && step === 5} active={corpOn(0, 2)} />
          <Box x={B.x} y={Y1} w={B.w} h={52} label="Borne" sub="VALMONT-CORP" monoSub active={corpOn(0, 1) || corpOn(4, 4)} wash={corpOn(0, 1) || corpOn(4, 4)} />
          <Box x={K.x} y={Y1} w={K.w} h={52} label="Contrôleur" active={corpOn(1, 1)} wash={corpOn(1, 1)} />
          <Box x={R.x} y={Y1} w={R.w} h={52} label="RADIUS" sub="NPS" active={corpOn(2, 4)} wash={corpOn(2, 4)} tone={corpOn(4, 4) ? "ok" : "default"} />
          <Box x={D.x} y={Y1} w={D.w} h={52} label="Annuaire" sub="AD DS" active={corpOn(3, 3)} wash={corpOn(3, 3)} />
          {!guest ? (
            <Appear key={`st-${step}`} reduced={reduced} delay={reduced ? 0 : 0.9}>
              {step <= 3 ? (
                <Label x={C.x} y={140} color="var(--warn)">
                  EAP seul
                </Label>
              ) : null}
              {step === 2 ? (
                <Label x={(C.x + R.x) / 2} y={140} color="var(--signal)">
                  tunnel chiffré de bout en bout
                </Label>
              ) : null}
              {step === 4 ? (
                <Label x={R.x} y={140} color="var(--ok)" weight={600}>
                  accepté
                </Label>
              ) : null}
              {step === 5 ? (
                <Label x={C.x + 6} y={140} color="var(--ok)" weight={600} anchor="start">
                  connecté, réseau des postes (VLAN 10)
                </Label>
              ) : null}
            </Appear>
          ) : null}
        </g>

        {/* Réseau invités */}
        <line x1={12} y1={166} x2={508} y2={166} stroke="var(--line)" strokeDasharray="4 4" />
        <Label x={16} y={190} anchor="start" weight={600} color="var(--ink-2)">
          Réseau invités, isolé
        </Label>
        <g opacity={guest ? 1 : 0.45} className="motion-safe:transition-opacity motion-safe:duration-300">
          <Arrow from={{ x: 76, y: Y2 }} to={{ x: 89, y: Y2 }} color={link(guest)} dashed />
          <Arrow from={{ x: 207, y: Y2 }} to={{ x: 219, y: Y2 }} color={link(guest)} />
          <Arrow from={{ x: 309, y: Y2 }} to={{ x: 411, y: Y2 }} color={guest ? "var(--ok)" : "var(--line-strong)"} />
          <Box x={C.x} y={Y2} w={C.w} h={52} label="Invité" active={guest} wash={guest} />
          <Box x={B.x} y={Y2} w={B.w} h={52} label="Borne" sub="VALMONT-INVITES" monoSub />
          <Box x={K.x} y={Y2} w={K.w} h={52} label={"Portail\ncaptif"} active={guest} wash={guest} />
          <Box x={D.x} y={Y2} w={D.w} h={52} label="Internet" tone={guest ? "ok" : "default"} wash={guest} />
          <line x1={360} y1={226} x2={360} y2={176} stroke="var(--danger)" strokeDasharray="3 3" strokeWidth={1.5} />
          <path d="M354 170 L366 182 M366 170 L354 182" stroke="var(--danger)" strokeWidth={2} />
          <Label x={372} y={188} anchor="start" color="var(--danger)">
            réseau interne
          </Label>
          <Label x={372} y={202} anchor="start" color="var(--danger)">
            inaccessible
          </Label>
          <Label x={360} y={286}>
            Internet seulement, après le portail
          </Label>
        </g>

        <g key={`tk-${step}`}>
          <Tokens step={step} reduced={reduced} />
        </g>
      </svg>
    </DiagramShell>
  );
}
