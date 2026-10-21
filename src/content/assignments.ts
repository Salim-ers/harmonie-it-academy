/**
 * Livrables relus par un mentor (offre Academy Pro).
 * Chaque critère de la grille est relié à une compétence : la note du mentor devient une preuve (poids 3).
 * Les situations sont fictives ; aucune donnée réelle d'entreprise n'est demandée.
 */
export type AssignmentDef = {
  slug: string;
  title: string;
  courseSlug: string;
  /** Consigne affichée à l'apprenant (paragraphes séparés par une ligne vide). */
  brief: string;
  rubric: { criterion: string; points: number; skill: string }[];
  requiredTier: number;
};

export const ASSIGNMENTS: AssignmentDef[] = [
  {
    slug: "compte-rendu-incident",
    title: "Compte rendu d'incident pour le N2",
    courseSlug: "support-metier-itsm",
    brief: `Choisissez un incident que vous avez traité dans Harmonie Labs (ou un incident réel, anonymisé : aucun nom, aucune adresse IP ou nom de machine réels).

Rédigez le compte rendu que vous laisseriez dans le ticket pour un collègue N2 qui reprend le dossier demain matin sans pouvoir vous joindre : symptôme et impact, ce que vous avez testé dans l'ordre et ce que chaque test a montré, cause retenue et pourquoi, ce qui a été fait, comment vous avez vérifié, ce qui reste à faire.

Longueur conseillée : 150 à 300 mots. Écrivez pour être compris en une lecture.`,
    rubric: [
      { criterion: "Symptôme et impact posés en une ou deux phrases", points: 3, skill: "documentation" },
      { criterion: "Tests listés dans l'ordre avec leur résultat", points: 5, skill: "diagnostic" },
      { criterion: "Cause justifiée par les tests, pas supposée", points: 4, skill: "diagnostic" },
      { criterion: "Vérification de la résolution décrite", points: 3, skill: "diagnostic" },
      { criterion: "Reprise possible sans contexte (clair, sans jargon inutile, données anonymisées)", points: 5, skill: "documentation" },
    ],
    requiredTier: 2,
  },
  {
    slug: "article-base-connaissances",
    title: "Article de base de connaissances pour les utilisateurs",
    courseSlug: "support-metier-itsm",
    brief: `Le service desk du Groupe Valmont (entreprise fictive) reçoit chaque semaine la même demande : « Je ne vois plus l'imprimante de mon étage depuis que j'ai changé de bureau. »

Rédigez l'article que les utilisateurs liront avant d'appeler : un titre qui reprend leurs mots, à qui s'adresse l'article, les étapes numérotées (avec ce qu'ils doivent voir à l'écran à chaque étape), ce qu'il ne faut pas faire, et quand ouvrir un ticket avec quelles informations.

Public : des collaborateurs non techniciens. Longueur conseillée : 200 à 350 mots.`,
    rubric: [
      { criterion: "Titre et introduction dans les mots de l'utilisateur", points: 3, skill: "communication" },
      { criterion: "Étapes numérotées, une action par étape, résultat attendu indiqué", points: 6, skill: "documentation" },
      { criterion: "Aucun jargon non expliqué, ton rassurant", points: 4, skill: "communication" },
      { criterion: "Limites claires : ce qu'il ne faut pas faire, quand appeler", points: 3, skill: "printing" },
      { criterion: "Informations à fournir dans le ticket", points: 4, skill: "documentation" },
    ],
    requiredTier: 2,
  },
  {
    slug: "arrivee-collaborateur",
    title: "Procédure d'arrivée d'un nouveau collaborateur",
    courseSlug: "identites-et-infrastructure",
    brief: `Nordelis Logistique (entreprise fictive) accueille lundi une assistante commerciale. Le manager a seulement écrit : « Elle doit avoir un PC et ses accès comme Julie. »

Rédigez la procédure que vous suivrez, sous forme de liste de contrôle : informations à obtenir avant de commencer (et auprès de qui), création et rattachement du compte, licence et messagerie, groupes et droits (et pourquoi « comme Julie » ne suffit pas), préparation du poste, premier contact avec la collaboratrice, vérifications finales et traçabilité dans le ticket.`,
    rubric: [
      { criterion: "Informations préalables et validation par le responsable", points: 4, skill: "itsm" },
      { criterion: "Compte et groupes : principe du moindre privilège, pas de copie aveugle", points: 5, skill: "identity" },
      { criterion: "Licence, messagerie et double authentification", points: 4, skill: "m365" },
      { criterion: "Poste prêt et vérifié avant l'arrivée", points: 3, skill: "windows" },
      { criterion: "Accueil de l'utilisatrice et traçabilité", points: 4, skill: "communication" },
    ],
    requiredTier: 2,
  },
  {
    slug: "presentation-entretien",
    title: "Présentation de deux minutes et récit d'un diagnostic",
    courseSlug: "support-metier-itsm",
    brief: `Préparez par écrit ce que vous direz en entretien pour un poste de technicien support N1 :

1. « Présentez-vous » en deux minutes à l'oral (environ 250 mots) : d'où vous venez, ce que vous savez faire aujourd'hui, preuves à l'appui, pourquoi ce poste.

2. « Racontez-moi un problème technique que vous avez résolu » avec la structure Situation, Action, Résultat. Un incident de Harmonie Labs est un bon support : dites-le simplement.

Le mentor relit le fond (preuves, méthode, clarté), pas votre accent ni votre style.`,
    rubric: [
      { criterion: "Présentation structurée et reliée au poste", points: 5, skill: "communication" },
      { criterion: "Compétences appuyées sur des preuves concrètes", points: 4, skill: "communication" },
      { criterion: "Récit de diagnostic : méthode visible, étapes ordonnées", points: 6, skill: "diagnostic" },
      { criterion: "Résultat et enseignement tiré", points: 5, skill: "diagnostic" },
    ],
    requiredTier: 2,
  },
];
