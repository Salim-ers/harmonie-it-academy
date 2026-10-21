"use client";

import { useState } from "react";
import { Arrow, Box, ChoiceGroup, DiagramShell, InfoPanel, Label, type Pt } from "./shared";

type NodeId = "desk" | "portal" | "kb" | "incident" | "request" | "problem" | "change" | "cmdb";

const NODES: Record<NodeId, { x: number; y: number; w: number; label: string; sub?: string }> = {
  desk: { x: 70, y: 50, w: 112, label: "Service desk", sub: "N1" },
  kb: { x: 262, y: 50, w: 132, label: "Base de\nconnaissances" },
  portal: { x: 454, y: 50, w: 112, label: "Portail", sub: "N0, self-service" },
  incident: { x: 70, y: 160, w: 112, label: "Incidents", sub: "service dégradé" },
  problem: { x: 262, y: 160, w: 132, label: "Problème", sub: "cause racine" },
  change: { x: 454, y: 160, w: 112, label: "Changement", sub: "correction" },
  request: { x: 70, y: 270, w: 112, label: "Demandes", sub: "de service" },
  cmdb: { x: 262, y: 270, w: 132, label: "CMDB", sub: "configuration" },
};

type EdgeDef = { id: string; a: NodeId; b: NodeId; from: Pt; to: Pt; label?: string; lx?: number; ly?: number; anchor?: "start" | "middle" | "end"; dashed?: boolean; path?: string };
const EDGES: EdgeDef[] = [
  { id: "kb-desk", a: "kb", b: "desk", from: { x: 194, y: 50 }, to: { x: 128, y: 50 }, label: "alimente", lx: 161, ly: 40 },
  { id: "kb-portal", a: "kb", b: "portal", from: { x: 330, y: 50 }, to: { x: 396, y: 50 }, label: "alimente", lx: 363, ly: 40 },
  { id: "desk-incident", a: "desk", b: "incident", from: { x: 70, y: 76 }, to: { x: 70, y: 128 } },
  { id: "desk-request", a: "desk", b: "request", from: { x: 14, y: 50 }, to: { x: 14, y: 270 }, path: "M14 50 H6 V270 H10" },
  { id: "incident-problem", a: "incident", b: "problem", from: { x: 140, y: 160 }, to: { x: 194, y: 160 }, label: "regroupés", lx: 165, ly: 150 },
  { id: "change-problem", a: "change", b: "problem", from: { x: 396, y: 160 }, to: { x: 330, y: 160 }, label: "corrige", lx: 363, ly: 150 },
  { id: "problem-kb", a: "problem", b: "kb", from: { x: 262, y: 134 }, to: { x: 262, y: 76 }, label: "erreur connue", lx: 270, ly: 109, anchor: "start" },
  { id: "cmdb-problem", a: "cmdb", b: "problem", from: { x: 262, y: 244 }, to: { x: 262, y: 186 }, dashed: true },
  { id: "cmdb-incident", a: "cmdb", b: "incident", from: { x: 194, y: 256 }, to: { x: 118, y: 186 }, dashed: true },
  { id: "cmdb-change", a: "cmdb", b: "change", from: { x: 330, y: 256 }, to: { x: 406, y: 186 }, dashed: true },
];

const INFO: Record<NodeId, { title: string; text: string; links: string }> = {
  desk: {
    title: "Service desk (N0 et N1)",
    text: "Point de contact unique entre les utilisateurs et l'informatique. Le N0 est le portail en self-service, le N1 l'équipe de techniciens. Il enregistre incidents et demandes et résout ce qu'il peut au premier contact.",
    links: "Il s'appuie sur la base de connaissances pour répondre vite et de la même façon à tous.",
  },
  portal: {
    title: "Portail en self-service (N0)",
    text: "L'utilisateur y trouve des articles pour se dépanner seul, suit ses tickets et formule ses demandes à partir d'un catalogue.",
    links: "La base de connaissances l'alimente : chaque solution documentée évite des appels.",
  },
  kb: {
    title: "Base de connaissances",
    text: "Articles de solution, contournements et procédures, rédigés et tenus à jour par le support.",
    links: "Elle alimente le N0 (le portail) et le N1 (le service desk). Les erreurs connues issues de la gestion des problèmes y sont publiées avec leur contournement.",
  },
  incident: {
    title: "Incident",
    text: "Interruption ou dégradation d'un service. Objectif : rétablir le service le plus vite possible, au besoin par un contournement. Exemple : INC-2041, l'export PDF du logiciel de paie plante.",
    links: "Enregistré par le service desk. Quand plusieurs incidents se ressemblent, ils sont regroupés et rattachés à un problème. Chaque incident concerne un élément de la CMDB.",
  },
  request: {
    title: "Demande de service",
    text: "Rien n'est cassé : l'utilisateur demande quelque chose de prévu au catalogue, comme un deuxième écran, un accès ou un logiciel. Elle suit un circuit standard, souvent avec une validation.",
    links: "Enregistrée par le service desk, comme un incident, mais traitée selon une autre file et d'autres délais.",
  },
  problem: {
    title: "Problème",
    text: "La cause, souvent inconnue au départ, d'un ou de plusieurs incidents. Objectif : trouver la cause racine et l'éliminer pour que les incidents ne reviennent pas. Exemple : PRB-0012, un défaut de la version 4.2 du logiciel de paie à l'origine de trois incidents.",
    links: "Il regroupe des incidents. Une fois la cause et un contournement connus, il devient une erreur connue publiée dans la base de connaissances. Un changement le corrige.",
  },
  change: {
    title: "Changement",
    text: "Ajout, modification ou suppression de tout ce qui peut affecter un service : ici, le déploiement du correctif 4.2.1. Il est évalué, autorisé, planifié et prévoit un retour arrière.",
    links: "Il corrige le problème. Il porte sur des éléments de la CMDB, qui est mise à jour une fois le changement réalisé.",
  },
  cmdb: {
    title: "CMDB",
    text: "Base de données de gestion des configurations : elle recense les éléments de configuration (postes, serveurs, applications, licences) et leurs relations.",
    links: "Incidents, problèmes et changements y sont rattachés : on sait quel élément est touché et ce qui en dépend avant d'intervenir.",
  },
};

const ORDER: NodeId[] = ["incident", "request", "problem", "change", "kb", "cmdb", "desk"];
const LABELS: Record<NodeId, string> = {
  incident: "Incident",
  request: "Demande",
  problem: "Problème",
  change: "Changement",
  kb: "Base de connaissances",
  cmdb: "CMDB",
  desk: "Service desk et portail",
  portal: "Portail",
};

export default function ItilPracticesDiagram() {
  const [sel, setSel] = useState<NodeId | null>(null);
  const group: NodeId[] = sel === "desk" ? ["desk", "portal"] : sel ? [sel] : [];
  const edgeOn = (e: EdgeDef) => group.includes(e.a) || group.includes(e.b);
  const related = new Set<NodeId>();
  EDGES.forEach((e) => {
    if (edgeOn(e)) {
      related.add(e.a);
      related.add(e.b);
    }
  });
  const info = sel ? INFO[sel] : null;

  return (
    <DiagramShell
      title="Pratiques ITIL autour du service desk : incidents, demandes, problèmes, changements, base de connaissances et CMDB"
      controls={
        <div>
          <ChoiceGroup label="Choisissez une pratique pour voir ses liens" options={ORDER.map((id) => ({ id, label: LABELS[id] }))} value={sel} onChange={setSel} />
          <InfoPanel title={info ? info.title : "Les liens à retenir"}>
            {info ? (
              <>
                <p>{info.text}</p>
                <p>
                  <span className="font-medium text-ink">Liens : </span>
                  {info.links}
                </p>
              </>
            ) : (
              <p>
                Un problème regroupe des incidents semblables. Un changement corrige le problème. La base de connaissances alimente le portail N0 et
                le service desk N1. La CMDB décrit les éléments concernés par chacun.
              </p>
            )}
          </InfoPanel>
        </div>
      }
    >
      <svg viewBox="0 0 520 300" className="h-auto w-full" aria-hidden="true">
        {EDGES.map((e) => {
          const on = edgeOn(e);
          const dim = sel !== null && !on;
          const color = on ? "var(--signal)" : "var(--line-strong)";
          return (
            <g key={e.id} opacity={dim ? 0.4 : 1}>
              {e.path ? (
                <g>
                  <path d={e.path} fill="none" stroke={color} strokeWidth={on ? 2 : 1.5} />
                  <polygon points={`${e.to.x},${e.to.y} ${e.to.x - 6},${e.to.y - 4} ${e.to.x - 6},${e.to.y + 4}`} fill={color} />
                </g>
              ) : (
                <Arrow from={e.from} to={e.to} color={color} dashed={e.dashed} width={on ? 2 : 1.5} />
              )}
              {e.label ? (
                <Label x={e.lx ?? 0} y={e.ly ?? 0} anchor={e.anchor ?? "middle"} color={on ? "var(--signal)" : "var(--muted)"}>
                  {e.label}
                </Label>
              ) : null}
            </g>
          );
        })}
        {/* Pile d'incidents */}
        {[8, 4].map((d) => (
          <rect
            key={d}
            opacity={sel !== null && !group.includes("incident") && !related.has("incident") ? 0.45 : 1} x={70 - 56 + d} y={160 - 24 - d} width={112}
            height={48}
            rx={10}
            fill="var(--surface)"
            stroke="var(--line-strong)"
            strokeWidth={1}
          />
        ))}
        {(Object.keys(NODES) as NodeId[]).map((id) => {
          const n = NODES[id];
          const on = group.includes(id);
          return (
            <Box key={id} x={n.x} y={n.y} w={n.w} h={48} label={n.label} sub={n.sub} active={on} wash={on} dim={sel !== null && !on && !related.has(id)} />
          );
        })}
      </svg>
    </DiagramShell>
  );
}
