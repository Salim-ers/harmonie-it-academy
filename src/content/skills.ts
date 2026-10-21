/**
 * Référentiel de compétences Harmonie (socle Support IT N1).
 * Chaque compétence appartient à un domaine affiché sur la carte de compétences.
 */
export const SKILL_DOMAINS = {
  reseau: "Réseau",
  windows: "Windows",
  itsm: "ITSM",
  diagnostic: "Diagnostic",
  communication: "Communication",
  identites: "Identités et cloud",
  materiel: "Matériel et infrastructure",
} as const;
export type SkillDomain = keyof typeof SKILL_DOMAINS;

export const SKILLS: { code: string; name: string; domain: SkillDomain; description: string }[] = [
  { code: "itsm", name: "Processus ITSM et cycle de vie des tickets", domain: "itsm", description: "Qualifier, prioriser, suivre, escalader et clôturer un ticket selon les bonnes pratiques ITIL." },
  { code: "itsm-tools", name: "Outils de ticketing", domain: "itsm", description: "Utiliser un outil ITSM (GLPI et équivalents) : catégories, affectation, base de connaissances." },
  { code: "diagnostic", name: "Méthode de diagnostic", domain: "diagnostic", description: "Partir du symptôme, mesurer l'impact, isoler la cause par des tests ordonnés et valider la résolution." },
  { code: "communication", name: "Relation utilisateur", domain: "communication", description: "Questionner, reformuler, rassurer et expliquer sans jargon." },
  { code: "documentation", name: "Rédaction technique", domain: "communication", description: "Rédiger des tickets, comptes rendus et articles de base de connaissances exploitables." },
  { code: "hardware", name: "Matériel et périphériques", domain: "materiel", description: "Composants d'un poste, démarrage, périphériques et pilotes." },
  { code: "printing", name: "Impression en entreprise", domain: "materiel", description: "Files d'attente, ports, pilotes et imprimantes réseau ou thermiques." },
  { code: "virtualization", name: "Virtualisation (notions)", domain: "materiel", description: "Hyperviseurs, machines virtuelles, snapshots et usages." },
  { code: "windows", name: "Administration du poste Windows", domain: "windows", description: "Comptes, profils, services, journaux, disques et mises à jour sous Windows 10/11." },
  { code: "powershell", name: "PowerShell et ligne de commande", domain: "windows", description: "Lire, interroger et diagnostiquer avec PowerShell et l'invite de commandes." },
  { code: "network-ip", name: "Adressage IP", domain: "reseau", description: "Adresse, masque, CIDR, passerelle, calcul de sous-réseaux." },
  { code: "network-services", name: "Services réseau (DHCP, DNS)", domain: "reseau", description: "Attribution d'adresses, résolution de noms et diagnostic associé." },
  { code: "network-fundamentals", name: "Fondamentaux réseau", domain: "reseau", description: "Modèles OSI/TCP-IP, Ethernet, ARP, TCP/UDP, ports et équipements." },
  { code: "wifi", name: "Wi-Fi d'entreprise", domain: "reseau", description: "SSID, bandes, authentification WPA2/WPA3-Entreprise et diagnostic radio de base." },
  { code: "vlan", name: "VLAN (introduction)", domain: "reseau", description: "Segmentation logique, ports d'accès et trunk, impact sur le support." },
  { code: "identity", name: "Annuaires et identités", domain: "identites", description: "Active Directory, comptes, groupes, verrouillages et droits d'accès." },
  { code: "m365", name: "Microsoft 365 et Entra ID", domain: "identites", description: "Comptes cloud, licences, MFA, Outlook, Teams et OneDrive." },
  { code: "security-hygiene", name: "Sécurité au poste de travail", domain: "identites", description: "Mots de passe, MFA, hameçonnage, moindre privilège et bons réflexes." },
];
