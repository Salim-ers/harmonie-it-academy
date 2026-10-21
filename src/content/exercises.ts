/**
 * Exercices pratiques corrigés : chaque exercice est une mise en situation progressive
 * (contexte commun rappelé dans chaque question). Les questions sont dans questions/exercices.json.
 */
import type { CatalogAssessment } from "./catalog";

export const EXERCISES: CatalogAssessment[] = [
  {
    slug: "ex-lire-ipconfig",
    title: "Lire trois ipconfig /all et poser le diagnostic",
    description:
      "Groupe Valmont, siège (valmont.local, 10.20.0.0/16). Trois utilisateurs signalent des problèmes réseau différents. À partir de l'extrait d'ipconfig /all de chaque poste, identifiez la cause (APIPA, DNS saisi à la main, mauvaise passerelle), choisissez la première action adaptée et rédigez le commentaire de résolution d'un des tickets.",
    kind: "exercise",
    requiredTier: 0,
    passPercent: 60,
    questions: ["ex-ipc-poste-a", "ex-ipc-poste-b", "ex-ipc-passerelle-c", "ex-ipc-actions", "ex-ipc-note-b"],
  },
  {
    slug: "ex-prioriser-tickets",
    title: "Prioriser six tickets un lundi matin",
    description:
      "Centre de services du Groupe Valmont, 8 h 50 : six tickets attendent. Appliquez la règle du service (impact × urgence) pour les classer, associez à chacun la première action pertinente, gérez l'appel d'un directeur pressé et justifiez vos choix auprès de votre responsable.",
    kind: "exercise",
    requiredTier: 0,
    passPercent: 60,
    questions: ["ex-prio-ordre", "ex-prio-actions", "ex-prio-vip", "ex-prio-justification"],
  },
  {
    slug: "ex-sous-reseaux",
    title: "Calculer le plan d'adressage d'un entrepôt",
    description:
      "Nordelis Logistique (10.30.0.0/16) redécoupe le réseau de son entrepôt : bureaux, terminaux RF, caméras et imprimantes thermiques. Calculez adresses réseau, diffusion, plages et nombre d'hôtes, choisissez le bon préfixe et vérifiez l'appartenance d'un équipement à son sous-réseau. Posez chaque calcul et vérifiez-le avant de répondre.",
    kind: "exercise",
    requiredTier: 1,
    passPercent: 60,
    questions: [
      "ex-sr-reseau-bureaux",
      "ex-sr-broadcast-bureaux",
      "ex-sr-derniere-rf",
      "ex-sr-hotes-cameras",
      "ex-sr-masque-imprimantes",
      "ex-sr-meme-reseau",
    ],
  },
  {
    slug: "ex-journal-evenements",
    title: "Trouver la piste dans l'Observateur d'événements",
    description:
      "Nordelis Logistique : un poste qui s'éteint brutalement, un service de quai qui ne démarre plus, un compte qui se verrouille chaque matin. Lisez les extraits des journaux Système et Sécurité, reliez chaque identifiant d'événement à sa signification, identifiez la piste la plus probable et documentez votre analyse dans le ticket.",
    kind: "exercise",
    requiredTier: 1,
    passPercent: 60,
    questions: ["ex-jrn-kernel-power", "ex-jrn-correspondances", "ex-jrn-scm-dependance", "ex-jrn-verrouillage", "ex-jrn-note-verrouillage"],
  },
  {
    slug: "ex-powershell-commandes",
    title: "Diagnostiquer un poste avec PowerShell",
    description:
      "Groupe Valmont : vous intervenez à distance sur le poste VLM-PC-0231 (impressions bloquées, lenteur, intranet inaccessible). Complétez les commandes PowerShell de diagnostic et choisissez la bonne commande pour chaque besoin, en privilégiant celles qui interrogent sans rien modifier.",
    kind: "exercise",
    requiredTier: 1,
    passPercent: 60,
    questions: ["ex-ps-service-spouleur", "ex-ps-top-cpu", "ex-ps-port", "ex-ps-volume", "ex-ps-besoins", "ex-ps-restart"],
  },
  {
    slug: "ex-arrivee-collaborateur",
    title: "Préparer l'arrivée d'une collaboratrice",
    description:
      "Groupe Valmont : Inès Garnier rejoint le service ADV lundi 9 h. Ordonnez la procédure d'arrivée, listez ce qu'il faut prévoir (compte, licence, groupes, matériel, MFA), appliquez les bons réflexes de sécurité et rédigez le message de bienvenue avec la checklist du premier jour.",
    kind: "exercise",
    requiredTier: 1,
    passPercent: 60,
    questions: ["ex-arr-procedure", "ex-arr-elements", "ex-arr-mot-de-passe", "ex-arr-mfa", "ex-arr-message"],
  },
  {
    slug: "ex-note-cloture",
    title: "Rédiger une note de clôture exploitable",
    description:
      "Groupe Valmont, ticket INC-2026-08812 : le poste d'une comptable ralentit à cause d'un disque saturé. L'incident est résolu ; il reste à le documenter. Identifiez ce qu'une note de clôture doit contenir, choisissez le bon ton, vérifiez les conditions de clôture puis rédigez la note complète : cause, actions, validation et prévention.",
    kind: "exercise",
    requiredTier: 2,
    passPercent: 60,
    questions: ["ex-nc-elements", "ex-nc-ton", "ex-nc-validation", "ex-nc-redaction"],
  },
  {
    slug: "ex-utilisateur-mecontent",
    title: "Répondre à un utilisateur mécontent",
    description:
      "Groupe Valmont : le directeur commercial signale pour la troisième fois que ses e-mails ne partent pas en déplacement, à deux jours d'une présentation client. Choisissez ce que votre réponse doit contenir, ordonnez votre prise en charge et rédigez une réponse écrite qui reconnaît sa gêne, s'engage concrètement et évite le jargon.",
    kind: "exercise",
    requiredTier: 2,
    passPercent: 60,
    questions: ["ex-um-elements", "ex-um-ouverture", "ex-um-etapes", "ex-um-reponse"],
  },
];
