/**
 * Composition des évaluations transverses. Les listes sont complétées lorsque la banque de questions
 * est rédigée ; load.ts refuse toute question inexistante.
 */
import type { CatalogAssessment } from "./catalog";

export const PLACEMENT_N1: CatalogAssessment = {
  slug: "positionnement-support-n1",
  title: "Positionnement initial — Support N1",
  description: "Douze questions pour situer votre point de départ et adapter votre parcours. Aucune note n'est éliminatoire.",
  kind: "placement",
  requiredTier: 0,
  passPercent: 0,
  questions: ["niveaux-modele-universel", "ticket-incident-demande", "methode-ordre-tests", "materiel-ram-role", "comptes-moindre-privilege", "ps-politique-vf", "ip-sans-passerelle", "dhcp-apipa-sens", "dns-commande-flush", "osi-ping-couche4", "ad-groupe-distribution", "m365-entra-ancien-nom"],
};

export const MOCK_EXAM_N1: CatalogAssessment = {
  slug: "examen-blanc-support-n1",
  title: "Examen blanc — Support N1",
  description: "Vingt questions dans les conditions de l'examen, avec correction détaillée immédiate.",
  kind: "mock_exam",
  course: "support-metier-itsm",
  requiredTier: 2,
  timeLimitMin: 30,
  passPercent: 70,
  questions: ["dns-exam-2", "osi-exam-2", "tcp-exam-2", "arp-exam-2", "netcmd-exam-2", "wifi-exam-2", "vlan-exam-2", "ad-exam-2", "m365-exam-2", "virt-exam-2", "niveaux-whoami-local", "methode-une-chose", "materiel-wmic-vf", "comptes-whoami-type", "disques-volume-fill", "dhcp-option-dns", "tcp-udp-usages", "wifi-ssid-bssid", "m365-owa-test", "ticket-statuts-ordre"],
};

export const EXAM_N1: CatalogAssessment = {
  slug: "examen-final-support-n1",
  title: "Examen final — Support N1",
  description: "Quarante questions, soixante minutes, trois tentatives. La réussite (70 %) donne lieu à une attestation interne Harmonie IT Academy.",
  kind: "exam",
  course: "support-metier-itsm",
  requiredTier: 2,
  timeLimitMin: 60,
  passPercent: 70,
  maxAttempts: 3,
  isProtected: true,
  questions: ["niveaux-exam-1", "ticket-exam-1", "comm-exam-1", "methode-exam-1", "itil-exam-1", "glpi-exam-1", "materiel-exam-1", "boot-exam-1", "print-exam-1", "comptes-exam-1", "windiag-exam-1", "ps-exam-1", "disques-exam-1", "ip-exam-1", "cidr-exam-1", "dns-exam-1", "osi-exam-1", "tcp-exam-1", "arp-exam-1", "netcmd-exam-1", "wifi-exam-1", "vlan-exam-1", "ad-exam-1", "m365-exam-1", "virt-exam-1", "niveaux-exam-2", "ticket-exam-2", "comm-exam-2", "methode-exam-2", "itil-exam-2", "glpi-exam-2", "materiel-exam-2", "boot-exam-2", "print-exam-2", "comptes-exam-2", "windiag-exam-2", "ps-exam-2", "disques-exam-2", "ip-exam-2", "cidr-exam-2"],
};
