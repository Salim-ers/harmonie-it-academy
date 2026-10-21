"use client";

import { useState } from "react";
import { Box, ChoiceGroup, DiagramShell, InfoPanel, Label } from "./shared";

type NodeId = "domain" | "siege" | "entrepot" | "gpo" | "users" | "computers" | "groups" | "entrepotSub" | "compta" | "pc" | "ggc" | "ggs" | "claire";

const NODES: Record<NodeId, { x: number; y: number; w: number; h: number; label: string; sub?: string; mono?: boolean; dashed?: boolean }> = {
  domain: { x: 260, y: 26, w: 150, h: 36, label: "valmont.local", mono: true },
  siege: { x: 130, y: 92, w: 110, h: 40, label: "OU Siège" },
  gpo: { x: 285, y: 92, w: 168, h: 44, label: "GPO-U-Lecteurs-Reseau", sub: "liée à l'OU Siège", mono: true },
  entrepot: { x: 450, y: 92, w: 110, h: 40, label: "OU Entrepôt" },
  users: { x: 62, y: 160, w: 104, h: 40, label: "Utilisateurs" },
  computers: { x: 180, y: 160, w: 104, h: 40, label: "Ordinateurs" },
  groups: { x: 330, y: 160, w: 96, h: 40, label: "Groupes" },
  entrepotSub: { x: 450, y: 160, w: 110, h: 44, label: "Mêmes OU", sub: "que le siège", dashed: true },
  compta: { x: 62, y: 228, w: 104, h: 44, label: "Comptabilité", sub: "OU" },
  pc: { x: 180, y: 228, w: 104, h: 44, label: "PC-CPT-014", sub: "ordinateur", mono: true },
  ggc: { x: 330, y: 228, w: 132, h: 44, label: "GG_Comptabilite", sub: "groupe", mono: true },
  claire: { x: 62, y: 296, w: 110, h: 44, label: "Claire Lefort", sub: "utilisateur" },
  ggs: { x: 330, y: 296, w: 132, h: 44, label: "GG_Siege_Tous", sub: "groupe", mono: true },
};

const INFO: Record<NodeId, { name: string; title: string; dn: string; text: string; related: NodeId[] }> = {
  domain: {
    name: "Domaine valmont.local",
    title: "Le domaine valmont.local",
    dn: "DC=valmont,DC=local",
    text: "La racine de l'annuaire. Il est hébergé par les contrôleurs de domaine, qui vérifient chaque connexion. Tout ce qui est dessous lui appartient.",
    related: ["siege", "entrepot"],
  },
  siege: {
    name: "OU Siège",
    title: "Unité d'organisation Siège",
    dn: "OU=Siege,DC=valmont,DC=local",
    text: "Une OU est un dossier de l'annuaire. Elle sert à ranger les objets, à leur appliquer des GPO et à déléguer l'administration, par exemple au support du siège.",
    related: ["users", "computers", "groups", "gpo"],
  },
  entrepot: {
    name: "OU Entrepôt",
    title: "Unité d'organisation Entrepôt",
    dn: "OU=Entrepot,DC=valmont,DC=local",
    text: "Le site de l'entrepôt a sa propre OU, avec les mêmes sous-OU Utilisateurs, Ordinateurs et Groupes. Ses objets ne reçoivent pas la GPO liée à l'OU Siège.",
    related: ["entrepotSub"],
  },
  users: {
    name: "OU Utilisateurs",
    title: "OU Utilisateurs du siège",
    dn: "OU=Utilisateurs,OU=Siege,DC=valmont,DC=local",
    text: "Elle contient les comptes des personnes, rangés par service dans des sous-OU.",
    related: ["compta"],
  },
  computers: {
    name: "OU Ordinateurs",
    title: "OU Ordinateurs du siège",
    dn: "OU=Ordinateurs,OU=Siege,DC=valmont,DC=local",
    text: "Chaque poste joint au domaine possède un compte ordinateur. Le ranger dans la bonne OU détermine les GPO de configuration machine qu'il reçoit.",
    related: ["pc"],
  },
  groups: {
    name: "OU Groupes",
    title: "OU Groupes du siège",
    dn: "OU=Groupes,OU=Siege,DC=valmont,DC=local",
    text: "Les groupes de sécurité qui donnent des droits (partages, applications, licences). On donne les droits aux groupes, jamais directement aux personnes.",
    related: ["ggc", "ggs"],
  },
  entrepotSub: {
    name: "Sous-OU de l'entrepôt",
    title: "Sous-OU de l'entrepôt",
    dn: "OU=Utilisateurs,OU=Entrepot,DC=valmont,DC=local (et ainsi de suite)",
    text: "Même organisation qu'au siège : Utilisateurs, Ordinateurs et Groupes. Une structure identique d'un site à l'autre simplifie le travail du support.",
    related: ["entrepot"],
  },
  compta: {
    name: "OU Comptabilité",
    title: "OU Comptabilité",
    dn: "OU=Comptabilite,OU=Utilisateurs,OU=Siege,DC=valmont,DC=local",
    text: "Sous-OU qui range les comptes du service comptable. Elle hérite des GPO liées au-dessus d'elle, dont celle de l'OU Siège.",
    related: ["claire"],
  },
  claire: {
    name: "Claire Lefort",
    title: "Compte utilisateur Claire Lefort",
    dn: "CN=Claire Lefort,OU=Comptabilite,OU=Utilisateurs,OU=Siege,DC=valmont,DC=local",
    text: "Son compte est rangé dans l'OU Comptabilité et membre de GG_Comptabilite et GG_Siege_Tous : ses droits viennent de ces groupes. Elle reçoit la GPO de l'OU Siège par héritage. whoami /groups et gpresult /r le confirment sur son poste.",
    related: ["ggc", "ggs", "gpo"],
  },
  pc: {
    name: "PC-CPT-014",
    title: "Compte ordinateur PC-CPT-014",
    dn: "CN=PC-CPT-014,OU=Ordinateurs,OU=Siege,DC=valmont,DC=local",
    text: "Le poste a lui aussi un compte et un mot de passe dans l'annuaire, renouvelé automatiquement. S'il se désynchronise, le poste perd la relation d'approbation avec le domaine.",
    related: ["computers"],
  },
  ggc: {
    name: "GG_Comptabilite",
    title: "Groupe de sécurité GG_Comptabilite",
    dn: "CN=GG_Comptabilite,OU=Groupes,OU=Siege,DC=valmont,DC=local",
    text: "Il donne accès au partage et au logiciel de la comptabilité. Ajouter une personne à ce groupe lui ouvre ces accès à sa prochaine ouverture de session.",
    related: ["claire"],
  },
  ggs: {
    name: "GG_Siege_Tous",
    title: "Groupe de sécurité GG_Siege_Tous",
    dn: "CN=GG_Siege_Tous,OU=Groupes,OU=Siege,DC=valmont,DC=local",
    text: "Tous les collaborateurs du siège : accès aux ressources communes, comme l'intranet ou les imprimantes partagées.",
    related: ["claire"],
  },
  gpo: {
    name: "GPO-U-Lecteurs-Reseau",
    title: "Stratégie de groupe GPO-U-Lecteurs-Reseau",
    dn: "Stockée dans le conteneur Group Policy Objects, liée à OU=Siege",
    text: "Une GPO est un ensemble de réglages. Liée à l'OU Siège, elle s'applique aux utilisateurs de cette OU et de toutes ses sous-OU : ici, elle connecte les lecteurs réseau. Le « U » indique des réglages côté utilisateur.",
    related: ["siege", "users", "compta", "claire"],
  },
};
const ORDER: NodeId[] = ["domain", "siege", "entrepot", "users", "computers", "groups", "compta", "claire", "pc", "ggc", "ggs", "gpo"];

const T = (id: NodeId) => NODES[id].y - NODES[id].h / 2;
const Bt = (id: NodeId) => NODES[id].y + NODES[id].h / 2;

export default function AdStructureDiagram() {
  const [sel, setSel] = useState<NodeId | null>(null);
  const info = sel ? INFO[sel] : null;
  const related = new Set<NodeId>(sel ? INFO[sel].related : []);
  const memberOn = sel === "claire" || sel === "ggc" || sel === "ggs";
  const gpoOn = sel === "gpo" || sel === "siege";
  const tree = "var(--line-strong)";

  return (
    <DiagramShell
      title="Structure Active Directory du domaine valmont.local : OU, utilisateurs, ordinateurs, groupes et GPO"
      controls={
        <div>
          <ChoiceGroup label="Choisissez un objet de l'annuaire" options={ORDER.map((id) => ({ id, label: INFO[id].name }))} value={sel} onChange={setSel} />
          <InfoPanel title={info ? info.title : "Un annuaire rangé comme une arborescence"}>
            {info ? (
              <>
                <p className="font-mono text-[13px] break-all text-ink">{info.dn}</p>
                <p>{info.text}</p>
              </>
            ) : (
              <p>
                Le domaine contient des OU (unités d&apos;organisation) qui rangent utilisateurs, ordinateurs et groupes. Les droits passent par les
                groupes ; les réglages passent par les GPO liées aux OU. Choisissez un objet pour voir son nom complet et son rôle.
              </p>
            )}
          </InfoPanel>
        </div>
      }
    >
      <svg viewBox="0 0 520 324" className="h-auto w-full" aria-hidden="true">
        {/* Arborescence */}
        <path d={`M260 ${Bt("domain")} V62 M130 62 H450 M130 62 V${T("siege")} M450 62 V${T("entrepot")}`} stroke={tree} fill="none" strokeWidth={1.25} />
        <path d={`M130 ${Bt("siege")} V132 M62 132 H330 M62 132 V${T("users")} M180 132 V${T("computers")} M330 132 V${T("groups")}`} stroke={tree} fill="none" strokeWidth={1.25} />
        <path d={`M450 ${Bt("entrepot")} V${T("entrepotSub")}`} stroke={tree} fill="none" strokeWidth={1.25} strokeDasharray="3 3" />
        <path d={`M62 ${Bt("users")} V${T("compta")} M62 ${Bt("compta")} V${T("claire")} M180 ${Bt("computers")} V${T("pc")} M330 ${Bt("groups")} V${T("ggc")} M330 194 H412 V296 H396`} stroke={tree} fill="none" strokeWidth={1.25} />

        {/* Lien de GPO */}
        <line x1={201} y1={92} x2={187} y2={92} stroke={gpoOn ? "var(--signal)" : "var(--warn)"} strokeWidth={2} strokeDasharray="3 2" />

        {/* Appartenance aux groupes */}
        <g stroke={memberOn ? "var(--signal)" : "var(--line-strong)"} strokeWidth={memberOn ? 2 : 1.25} strokeDasharray="4 3" fill="none">
          <path d="M117 296 H264" />
          <path d="M117 290 L264 234" />
        </g>
        <Label x={190} y={314} color={memberOn ? "var(--signal)" : "var(--muted)"}>
          membre de
        </Label>

        {(Object.keys(NODES) as NodeId[]).map((id) => {
          const n = NODES[id];
          const on = sel === id;
          const rel = related.has(id);
          return (
            <Box
              key={id}
              x={n.x}
              y={n.y}
              w={n.w}
              h={n.h}
              label={n.label}
              sub={n.sub}
              monoLabel={n.mono}
              labelSize={n.mono && n.w < 170 ? 12 : 13}
              dashed={n.dashed}
              active={on}
              wash={on || rel}
              tone={id === "gpo" && !on ? "warn" : "default"}
              dim={sel !== null && !on && !rel}
            />
          );
        })}
      </svg>
    </DiagramShell>
  );
}
