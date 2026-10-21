/**
 * Relecture déterministe d'un CV de technicien support.
 *
 * Trois questions, dans l'ordre où un recruteur les pose :
 * 1. Le CV est-il lisible et complet (rubriques, contact, longueur, faits mesurables) ?
 * 2. Montre-t-il ce que vous avez réellement prouvé, et seulement ce que vous pouvez défendre ?
 * 3. Répond-il à l'offre visée ?
 *
 * Aucun score global : une note unique sur un CV ne voudrait rien dire. Chaque constat est expliqué.
 * Le texte du CV n'est jamais enregistré (voir `services/cv.ts`).
 */
import { JOB_TERMS } from "@/content/job-taxonomy";
import { containsPhrase, normalize } from "./rubric";
import type { JobOfferAnalysis } from "./job-offer";

export type CvCheck = {
  id: string;
  status: "ok" | "a-ameliorer" | "attention";
  title: string;
  detail: string;
};

export type CvTermLine = {
  id: string;
  label: string;
  /** Présent dans le CV. */
  inCv: boolean;
  /** Niveau prouvé sur la plateforme (null si aucune preuve). */
  provenLevel: number | null;
  confident: boolean;
  /** Demandé par l'offre choisie. */
  inOffer: boolean;
  importantInOffer: boolean;
  advice: string;
};

export type CvReview = {
  words: number;
  checks: CvCheck[];
  /** Compétences prouvées absentes du CV : à ajouter. */
  addProven: CvTermLine[];
  /** Compétences citées sans preuve suffisante : à préparer avant l'entretien. */
  defend: CvTermLine[];
  /** Termes de l'offre absents du CV et pas encore prouvés : à travailler. */
  offerGaps: CvTermLine[];
  offerCoverage: { inCv: number; total: number } | null;
  /** Rubrique proposée, à copier dans le CV. */
  suggestedSection: string[];
  disclaimer: string;
};

export type CvReviewOptions = {
  skillLevels?: Record<string, { level: number | null; confident: boolean }>;
  offer?: Pick<JobOfferAnalysis, "detected"> | null;
  portfolio?: { title: string; resolved: boolean }[];
  attestations?: { title: string; code: string }[];
  passportUrl?: string | null;
  appUrl?: string;
};

const SECTIONS: { id: string; label: string; patterns: string[]; essential: boolean }[] = [
  { id: "experience", label: "Expérience", patterns: ["experience", "experiences", "parcours professionnel", "emplois", "missions"], essential: true },
  { id: "formation", label: "Formation", patterns: ["formation", "formations", "diplome", "diplomes", "etudes", "cursus"], essential: true },
  { id: "competences", label: "Compétences", patterns: ["competences", "competence", "savoir-faire", "savoir faire", "connaissances techniques", "environnement technique", "skills"], essential: true },
  { id: "langues", label: "Langues", patterns: ["langues", "langue", "anglais", "english"], essential: false },
  { id: "projets", label: "Projets ou réalisations", patterns: ["projets", "projet", "realisations", "portfolio", "laboratoires"], essential: false },
];

const VAGUE = ["dynamique", "motive", "motivee", "polyvalent", "polyvalente", "rigoureux", "rigoureuse", "serieux", "serieuse", "passionne", "passionnee", "autonome", "esprit d equipe", "curieux", "curieuse", "force de proposition", "bon relationnel"];

const ACTION_VERBS = ["diagnostique", "resolu", "traite", "installe", "deploye", "configure", "redige", "documente", "accompagne", "forme", "migre", "gere", "assure", "remplace", "prepare", "masterise", "escalade", "reinitialise", "automatise", "inventorie", "supervise", "depanne", "mis en place", "mis a jour", "cree"];

const MEASURE = /\b\d+(?:[.,]\d+)?\s*(?:[a-z]+\s+){0,2}?(?:%|tickets?|fiches?|procedures?|articles?|appels?|utilisateurs?|collaborateurs?|postes?|sites?|imprimantes?|serveurs?|comptes?|demandes?|incidents?|interventions?|personnes?|agences?|magasins?|boutiques?|par jour|\/jour|h\b|heures?|minutes?|jours?)/g;

/** Repères de données personnelles qu'un CV n'a pas à contenir (art. L1221-6 du Code du travail). */
const SENSITIVE: { label: string; re: RegExp }[] = [
  { label: "date de naissance ou âge", re: /\b(?:ne|nee) le\b|\bdate de naissance\b|\b[1-6]\d ans\b(?! d)/ },
  { label: "situation familiale", re: /\b(?:marie|mariee|celibataire|pacse|pacsee|divorce|divorcee|enfants?\s*:|\d enfants?)\b/ },
  { label: "nationalité", re: /\bnationalite\b/ },
  { label: "numéro de sécurité sociale", re: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/ },
];

export function reviewCv(cvText: string, opts: CvReviewOptions = {}): CvReview {
  const raw = cvText.slice(0, 15000);
  const text = normalize(raw);
  const words = raw.split(/\s+/).filter(Boolean).length;
  const checks: CvCheck[] = [];

  // 1. Rubriques
  const missing = SECTIONS.filter((s) => s.essential && !s.patterns.some((p) => containsPhrase(text, p)));
  checks.push(
    missing.length
      ? { id: "rubriques", status: "a-ameliorer", title: "Rubriques essentielles", detail: `Rubrique introuvable : ${missing.map((m) => m.label).join(", ")}. Un recruteur lit d'abord les titres : nommez-les clairement. Sans expérience en informatique, gardez « Expérience » et montrez ce qui se transpose (accueil, gestion d'appels, rigueur de suivi).` }
      : { id: "rubriques", status: "ok", title: "Rubriques essentielles", detail: "Expérience, formation et compétences sont identifiables." },
  );
  if (!SECTIONS.find((s) => s.id === "projets")!.patterns.some((p) => containsPhrase(text, p))) {
    checks.push({ id: "projets", status: "a-ameliorer", title: "Réalisations concrètes", detail: "Ajoutez une rubrique « Projets » ou « Réalisations » : en reconversion, c'est elle qui prouve que vous savez faire. Vos incidents documentés du portfolio y ont leur place." });
  }

  // 2. Contact
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(raw);
  const hasPhone = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/.test(raw);
  checks.push(
    hasEmail && hasPhone
      ? { id: "contact", status: "ok", title: "Coordonnées", detail: "Adresse e-mail et téléphone présents." }
      : { id: "contact", status: "attention", title: "Coordonnées", detail: `Il manque ${[!hasEmail && "une adresse e-mail", !hasPhone && "un numéro de téléphone"].filter(Boolean).join(" et ")}. Ajoutez aussi votre ville ou zone de mobilité : c'est souvent un critère de tri pour un poste de proximité.` },
  );

  // 3. Données personnelles inutiles
  const sensitive = SENSITIVE.filter((s) => s.re.test(text)).map((s) => s.label);
  if (sensitive.length) {
    checks.push({ id: "donnees", status: "attention", title: "Informations personnelles", detail: `Le CV semble mentionner : ${sensitive.join(", ")}. Rien ne vous oblige à les donner : un employeur ne peut demander que des informations liées au poste (article L1221-6 du Code du travail). Retirez-les, ainsi que la photo si vous le souhaitez.` });
  }

  // 4. Longueur
  checks.push(
    words < 150
      ? { id: "longueur", status: "a-ameliorer", title: "Longueur", detail: `${words} mots : c'est court. Décrivez au moins deux expériences ou projets avec ce que vous avez fait et le résultat.` }
      : words > 900
        ? { id: "longueur", status: "a-ameliorer", title: "Longueur", detail: `${words} mots : visez une page pour un poste de technicien. Gardez ce qui sert le poste visé, résumez le reste.` }
        : { id: "longueur", status: "ok", title: "Longueur", detail: `${words} mots, compatible avec une page.` },
  );

  // 5. Faits mesurables et verbes d'action
  const measures = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(MEASURE) ?? [];
  checks.push(
    measures.length >= 2
      ? { id: "chiffres", status: "ok", title: "Faits mesurables", detail: `${measures.length} éléments chiffrés repérés (par exemple « ${measures[0]?.trim() ?? ""} »). Les recruteurs retiennent les volumes et les délais.` }
      : { id: "chiffres", status: "a-ameliorer", title: "Faits mesurables", detail: "Peu ou pas de chiffres. Donnez des ordres de grandeur : nombre d'utilisateurs, de tickets par jour, de postes préparés, délai de résolution. Une estimation honnête vaut mieux que rien." },
  );
  const verbs = ACTION_VERBS.filter((v) => containsPhrase(text, v));
  checks.push(
    verbs.length >= 3
      ? { id: "verbes", status: "ok", title: "Verbes d'action", detail: `Vous décrivez ce que vous avez fait (${verbs.slice(0, 4).join(", ")}…).` }
      : { id: "verbes", status: "a-ameliorer", title: "Verbes d'action", detail: "Décrivez des actions plutôt que des postes occupés : « diagnostiqué », « résolu », « documenté », « accompagné les utilisateurs »…" },
  );

  // 6. Qualités sans preuve
  const vague = VAGUE.filter((v) => containsPhrase(text, v));
  if (vague.length >= 2) {
    checks.push({ id: "qualites", status: "a-ameliorer", title: "Qualités affirmées", detail: `« ${vague.slice(0, 3).join(" », « ")} » : tout le monde l'écrit. Remplacez chaque qualité par un fait qui la montre, par exemple « 50 appels par jour traités en gardant un suivi écrit de chaque demande ».` });
  }

  // 7. Compétences : CV × preuves × offre
  const offerById = new Map((opts.offer?.detected ?? []).map((d) => [d.id, d]));
  const lines: CvTermLine[] = [];
  for (const t of JOB_TERMS) {
    const inCv = t.patterns.some((p) => containsPhrase(text, p));
    const od = offerById.get(t.id);
    const lv = t.skills.map((s) => opts.skillLevels?.[s]).filter((x): x is { level: number; confident: boolean } => Boolean(x && x.level !== null));
    const provenLevel = lv.length ? Math.round(lv.reduce((a, l) => a + l.level, 0) / lv.length) : null;
    const confident = lv.length > 0 && lv.every((l) => l.confident);
    if (!inCv && !od && provenLevel === null) continue;
    lines.push({ id: t.id, label: t.label, inCv, provenLevel, confident, inOffer: Boolean(od), importantInOffer: Boolean(od?.important), advice: t.advice });
  }
  const proven = (l: CvTermLine) => l.provenLevel !== null && l.provenLevel >= 60 && l.confident;
  const addProven = lines.filter((l) => !l.inCv && proven(l)).sort((a, b) => Number(b.inOffer) - Number(a.inOffer));
  const defend = lines.filter((l) => l.inCv && JOB_TERMS.find((t) => t.id === l.id)!.skills.length > 0 && !proven(l));
  const offerLines = lines.filter((l) => l.inOffer);
  const offerGaps = offerLines.filter((l) => !l.inCv && !proven(l)).sort((a, b) => Number(b.importantInOffer) - Number(a.importantInOffer));
  const offerCoverage = opts.offer ? { inCv: offerLines.filter((l) => l.inCv).length, total: offerLines.length } : null;

  // 8. Rubrique proposée, uniquement à partir de preuves réelles
  const suggestedSection: string[] = [];
  const provenSkills = lines.filter(proven);
  if (provenSkills.length) suggestedSection.push(`Compétences démontrées en situation simulée : ${provenSkills.map((l) => l.label).join(", ")}.`);
  const solved = (opts.portfolio ?? []).filter((p) => p.resolved);
  if (solved.length) {
    suggestedSection.push(
      `${solved.length} incident${solved.length > 1 ? "s" : ""} simulé${solved.length > 1 ? "s" : ""} résolu${solved.length > 1 ? "s" : ""} et documenté${solved.length > 1 ? "s" : ""} (diagnostic, résolution, note de clôture) : ${solved.slice(0, 3).map((p) => p.title.toLowerCase()).join(" ; ")}.`,
    );
  }
  for (const a of (opts.attestations ?? []).slice(0, 2)) {
    suggestedSection.push(`Attestation interne Harmonie IT Academy « ${a.title} », vérifiable sur ${opts.appUrl ?? ""}/verifier/${a.code}`);
  }
  if (opts.passportUrl) suggestedSection.push(`Passeport de compétences détaillé : ${opts.passportUrl}`);

  return {
    words,
    checks,
    addProven,
    defend,
    offerGaps,
    offerCoverage,
    suggestedSection,
    disclaimer:
      "Cette relecture repère des éléments de forme et des mots-clés ; elle ne juge ni votre parcours ni votre style. Gardez votre propre voix et n'ajoutez jamais une compétence que vous ne pouvez pas expliquer en entretien.",
  };
}
