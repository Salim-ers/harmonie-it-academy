/**
 * Notation déterministe d'un texte libre par grille explicite.
 *
 * Ce que fait cette grille : détecter la présence des notions attendues (avec synonymes),
 * signaler des formulations à risque et vérifier une structure minimale.
 * Ce qu'elle ne fait pas : juger la qualité de l'expression comme un recruteur ou un formateur.
 * Ce périmètre est affiché à l'apprenant à chaque correction.
 */
import type { Rubric } from "@/content/schema";

export type RubricResult = {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  matched: { id: string; label: string; points: number }[];
  missing: { id: string; label: string; points: number; required: boolean }[];
  redFlags: { id: string; label: string; penalty: number }[];
  structure?: { situation: boolean; action: boolean; result: boolean };
  wordCount: number;
  tooShort: boolean;
};

/** Minuscules, sans accents, ponctuation → espaces (on conserve . / : - _ utiles aux commandes). */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`"«»(),;!?[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Vrai si la formulation apparaît comme mot ou groupe de mots entier. Un « * » final accepte les suffixes. */
export function containsPhrase(normalizedText: string, pattern: string): boolean {
  const p = normalize(pattern);
  if (!p) return false;
  const prefix = p.endsWith("*");
  const core = escapeRe(prefix ? p.slice(0, -1) : p);
  const re = new RegExp(`(^|[^a-z0-9])${core}${prefix ? "" : "(?=$|[^a-z0-9])"}`);
  return re.test(normalizedText);
}

const NEGATIONS = new Set(["ne", "n", "pas", "jamais", "sans", "aucun", "aucune", "eviter", "evite", "surtout", "interdit", "refuse", "non"]);

/**
 * Comme containsPhrase, mais ignore les occurrences niées (« ne pas redémarrer le serveur »,
 * « sans IP fixe ») : utilisé pour les formulations à risque, qui ne doivent pénaliser que l'intention réelle.
 */
export function containsAffirmedPhrase(normalizedText: string, pattern: string): boolean {
  const p = normalize(pattern);
  if (!p) return false;
  const prefix = p.endsWith("*");
  const core = escapeRe(prefix ? p.slice(0, -1) : p);
  const re = new RegExp(`(^|[^a-z0-9])${core}${prefix ? "" : "(?=$|[^a-z0-9])"}`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalizedText))) {
    const before = normalizedText.slice(Math.max(0, m.index - 40), m.index).split(/[^a-z0-9]+/).filter(Boolean).slice(-4);
    if (!before.some((w) => NEGATIONS.has(w))) return true;
  }
  return false;
}

const STRUCTURE = {
  situation: ["situation", "contexte", "lors de", "quand j", "un jour", "chez", "dans mon", "en stage", "a l'epoque", "il y avait", "un utilisateur"],
  action: ["j ai", "jai", "j'ai", "je suis", "nous avons", "j ai verifie", "j ai commence", "action", "j ai propose", "j ai contacte"],
  result: ["resultat", "au final", "finalement", "ce qui a permis", "resolu", "le probleme a ete", "depuis", "cela a permis", "j en ai retenu", "appris"],
};

export function gradeText(text: string, rubric: Rubric & { expectStructure?: boolean }, minWords = 0): RubricResult {
  const n = normalize(text);
  const wordCount = n ? n.split(" ").length : 0;
  const maxScore = rubric.criteria.reduce((s, c) => s + c.points, 0);
  const matched: RubricResult["matched"] = [];
  const missing: RubricResult["missing"] = [];
  for (const c of rubric.criteria) {
    if (c.patterns.some((p) => containsPhrase(n, p))) matched.push({ id: c.id, label: c.label, points: c.points });
    else missing.push({ id: c.id, label: c.label, points: c.points, required: Boolean(c.required) });
  }
  const redFlags = (rubric.redFlags ?? [])
    .filter((f) => f.patterns.some((p) => containsAffirmedPhrase(n, p)))
    .map((f) => ({ id: f.id, label: f.label, penalty: f.penalty }));

  let score = matched.reduce((s, m) => s + m.points, 0) - redFlags.reduce((s, f) => s + f.penalty, 0);
  const tooShort = wordCount < minWords;
  if (tooShort) score = Math.min(score, Math.floor(maxScore * 0.3));
  score = Math.max(0, Math.min(maxScore, score));

  let structure: RubricResult["structure"];
  if (rubric.expectStructure) {
    const raw = ` ${n} `;
    structure = {
      situation: STRUCTURE.situation.some((k) => raw.includes(normalize(k))),
      action: STRUCTURE.action.some((k) => raw.includes(normalize(k))),
      result: STRUCTURE.result.some((k) => raw.includes(normalize(k))),
    };
  }
  const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  const requiredMissing = missing.some((m) => m.required);
  return {
    score,
    maxScore,
    percent,
    passed: percent >= (rubric.passPercent ?? 60) && !requiredMissing && !tooShort,
    matched,
    missing,
    redFlags,
    structure,
    wordCount,
    tooShort,
  };
}
