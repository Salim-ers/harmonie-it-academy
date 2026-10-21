/**
 * Structure du catalogue initial (seed). Une fois en base, tout est modifiable depuis Harmonie Studio.
 * Règle : aucune formation n'est déclarée sans leçons réellement rédigées (vérifié par load.ts).
 */
import { EXAM_N1, MOCK_EXAM_N1, PLACEMENT_N1 } from "./assessments";

export type CatalogCourse = {
  slug: string;
  title: string;
  summary: string;
  school: "support" | "infrastructure" | "security" | "cloud" | "career";
  level: "debutant" | "intermediaire" | "avance";
  requiredTier: number;
  objectives: string[];
  modules: { slug: string; title: string; lessons: string[] }[];
  /** Leçons accessibles gratuitement, quel que soit le niveau de la formation. */
  freeLessons?: string[];
};

export type CatalogAssessment = {
  slug: string;
  title: string;
  description: string;
  kind: "exercise" | "exam" | "placement" | "mock_exam";
  course?: string;
  requiredTier: number;
  timeLimitMin?: number;
  passPercent: number;
  maxAttempts?: number;
  isProtected?: boolean;
  questions: string[];
};

export const COURSES: CatalogCourse[] = [
  {
    slug: "support-metier-itsm",
    title: "Le métier du support et l'ITSM",
    summary: "Comprendre ce qu'on attend d'un technicien support, traiter un ticket de bout en bout et diagnostiquer avec méthode.",
    school: "support",
    level: "debutant",
    requiredTier: 1,
    objectives: [
      "Situer les rôles N0 à N3 et savoir quand escalader",
      "Qualifier, prioriser et documenter un ticket",
      "Appliquer une méthode de diagnostic reproductible",
    ],
    freeLessons: ["n1-metier-niveaux", "n1-ticket-cycle", "n1-methode-diagnostic"],
    modules: [
      { slug: "metier", title: "Découvrir le métier", lessons: ["n1-metier-niveaux", "n1-ticket-cycle", "n1-communication"] },
      { slug: "methode", title: "Méthode et outils", lessons: ["n1-methode-diagnostic", "n1-itil", "n1-glpi"] },
    ],
  },
  {
    slug: "poste-de-travail",
    title: "Le poste de travail : matériel et Windows",
    summary: "Du démarrage de la machine au dépannage de Windows 11 : composants, comptes, services, journaux, disques et PowerShell.",
    school: "support",
    level: "debutant",
    requiredTier: 1,
    objectives: [
      "Identifier les composants d'un poste et leur rôle dans une panne",
      "Diagnostiquer Windows avec les outils intégrés",
      "Utiliser PowerShell pour interroger un poste",
    ],
    freeLessons: ["n1-materiel"],
    modules: [
      { slug: "materiel", title: "Matériel et périphériques", lessons: ["n1-materiel", "n1-uefi-boot", "n1-imprimantes"] },
      { slug: "windows", title: "Windows 10 et 11", lessons: ["n1-windows-comptes", "n1-windows-diagnostic", "n1-powershell", "n1-windows-disques"] },
    ],
  },
  {
    slug: "reseau-pour-le-support",
    title: "Le réseau pour le support",
    summary: "Adressage, DHCP, DNS, protocoles et commandes de diagnostic : tout ce qu'il faut pour isoler une panne réseau et l'escalader proprement.",
    school: "support",
    level: "debutant",
    requiredTier: 1,
    objectives: [
      "Lire une configuration IP et calculer un sous-réseau",
      "Expliquer DHCP, DNS, ARP et TCP/UDP avec ses mots",
      "Isoler une panne réseau avec les commandes Windows",
    ],
    freeLessons: ["n1-adressage-ip", "n1-dhcp"],
    modules: [
      { slug: "adressage", title: "Adressage et services", lessons: ["n1-adressage-ip", "n1-cidr", "n1-dhcp", "n1-dns"] },
      { slug: "protocoles", title: "Protocoles", lessons: ["n1-osi", "n1-tcp-udp", "n1-arp-switch"] },
      { slug: "diagnostic-reseau", title: "Diagnostic et réseaux d'entreprise", lessons: ["n1-commandes-reseau", "n1-wifi", "n1-vlan"] },
    ],
  },
  {
    slug: "identites-et-infrastructure",
    title: "Identités, Microsoft 365 et infrastructure",
    summary: "Les notions d'annuaire, de comptes cloud et de virtualisation qu'un technicien N1 manipule chaque jour.",
    school: "infrastructure",
    level: "debutant",
    requiredTier: 1,
    objectives: [
      "Comprendre domaine, OU, comptes et groupes Active Directory",
      "Gérer un compte Microsoft 365 : licences, MFA, accès",
      "Expliquer la virtualisation et ses usages",
    ],
    modules: [{ slug: "identites", title: "Identités et infrastructure", lessons: ["n1-ad-notions", "n1-m365", "n1-virtualisation"] }],
  },
];

export const PATHS = [
  {
    slug: "technicien-support-n1",
    title: "Technicien support IT N1",
    summary: "Le parcours complet pour partir de zéro et être opérationnel sur un centre de services : fondamentaux, pratique sur incidents simulés, examen et préparation à l'entretien.",
    targetRole: "support_n1",
    courses: ["support-metier-itsm", "poste-de-travail", "reseau-pour-le-support", "identites-et-infrastructure"],
  },
];

export const SCENARIO_ORDER = [
  "zebra-quai-3",
  "apipa-bureau-demenage",
  "compte-verrouille-teletravail",
  "outlook-licence-retiree",
  "poste-lent-disque-plein",
  "teams-micro-muet",
  "partage-acces-refuse",
  "boutique-dns-manuel",
];

export const ASSESSMENTS: CatalogAssessment[] = [PLACEMENT_N1, MOCK_EXAM_N1, EXAM_N1];

export const PLANS = [
  {
    code: "decouverte",
    name: "Découverte",
    tier: 0,
    priceCents: 0,
    interval: "month" as const,
    tagline: "Pour essayer la méthode Harmonie, sans carte bancaire.",
    features: [
      "Leçons fondamentales en accès libre",
      "2 incidents simulés complets",
      "Analyse d'offre d'emploi et plan de préparation",
      "1 simulation d'entretien par mois",
      "Progression conservée",
    ],
  },
  {
    code: "academy",
    name: "Academy",
    tier: 1,
    priceCents: 1990,
    interval: "month" as const,
    tagline: "Toutes les formations fondamentales et la pratique au quotidien.",
    features: [
      "Toutes les leçons du parcours Support N1",
      "Quiz et exercices corrigés",
      "6 incidents simulés",
      "Carte de compétences avec preuves",
      "Passeport de compétences partageable",
    ],
  },
  {
    code: "pro",
    name: "Academy Pro",
    tier: 2,
    priceCents: 3990,
    interval: "month" as const,
    tagline: "Pour viser l'embauche : examens, simulations avancées et entretiens.",
    features: [
      "Tout Academy",
      "Incidents simulés avancés",
      "Examen blanc et examen final N1",
      "Attestation interne vérifiable",
      "Simulations d'entretien illimitées",
      "Relecture de 4 livrables par mois par un mentor (selon disponibilité)",
    ],
  },
  {
    code: "business",
    name: "Business",
    tier: 2,
    priceCents: null,
    interval: "custom" as const,
    tagline: "Former vos équipes support, avec un suivi par salarié.",
    features: ["Comptes salariés et groupes", "Affectation de formations", "Tableau de bord des résultats", "Facturation entreprise", "Export des rapports"],
  },
];

export const CATALOG = { courses: COURSES, paths: PATHS, assessments: ASSESSMENTS, scenarioOrder: SCENARIO_ORDER, plans: PLANS };
