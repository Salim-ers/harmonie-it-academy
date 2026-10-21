/**
 * Analyse déterministe d'une offre d'emploi : ce que l'offre demande, ce que le candidat a déjà prouvé
 * sur la plateforme, et un plan de préparation daté. Aucune IA, aucun coût variable, résultat explicable.
 */
import { IMPORTANCE_CUES, JOB_TERMS, LEVEL_CUES, type JobTerm } from "@/content/job-taxonomy";
import { containsPhrase, normalize } from "./rubric";

export type DetectedTerm = {
  id: string;
  label: string;
  category: JobTerm["category"];
  matched: string[];
  important: boolean;
  covered: boolean;
  advice: string;
  lessons: string[];
  scenarios: string[];
  skills: string[];
  /** Niveau prouvé du candidat (moyenne des compétences liées), null si aucune preuve. */
  candidateLevel: number | null;
  status: "acquis" | "a-consolider" | "a-travailler" | "hors-plateforme" | "non-evalue";
};

export type JobOfferAnalysis = {
  detected: DetectedTerm[];
  level: "n1" | "n2" | "inconnu";
  junior: boolean;
  experienceYears: number | null;
  languages: { english: boolean };
  sectors: string[];
  readiness: number | null;
  plan: { day: number; date: string | null; focus: string; tasks: { kind: "lecon" | "labo" | "entretien" | "revision"; label: string; ref?: string }[] }[];
  interviewFocus: { skills: string[]; sectors: string[]; english: boolean };
  disclaimer: string;
};

/** Texte en minuscules sans accents, ponctuation conservée (pour découper en phrases et en éléments de liste). */
function lowerKeepPunctuation(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Un terme est « indispensable » si un mot d'exigence le qualifie, et lui seulement :
 * - dans le même élément de liste (« Microsoft 365 indispensable, DNS » : seul Microsoft 365) ;
 * - ou en tête de phrase pour toute la liste qui suit (« Maîtrise de Windows, AD et GLPI », « Indispensable : Windows, AD »).
 */
function isImportant(rawText: string, pattern: string): boolean {
  const hasCue = (seg: string) => IMPORTANCE_CUES.some((c) => containsPhrase(normalize(seg), `${c}*`));
  for (const sentence of lowerKeepPunctuation(rawText).split(/[.;!?\n•]+/)) {
    if (!containsPhrase(normalize(sentence), pattern)) continue;
    const colon = sentence.indexOf(":");
    const header = colon >= 0 ? sentence.slice(0, colon) : "";
    const body = colon >= 0 ? sentence.slice(colon + 1) : sentence;
    if (header && hasCue(header)) return true;
    const segments = body.split(",");
    const first = normalize(segments[0] ?? "");
    const firstCue = IMPORTANCE_CUES.map((c) => first.search(new RegExp(`(^|[^a-z0-9])${c}`))).filter((i) => i >= 0);
    if (firstCue.length && segments.length > 1) {
      const firstTerm = JOB_TERMS.flatMap((t) => t.patterns).map((p) => first.indexOf(normalize(p))).filter((i) => i >= 0);
      if (!firstTerm.length || Math.min(...firstCue) < Math.min(...firstTerm)) return true;
    }
    if (segments.some((seg) => containsPhrase(normalize(seg), pattern) && hasCue(seg))) return true;
  }
  return false;
}

export function analyzeJobOffer(
  offerText: string,
  opts: {
    skillLevels?: Record<string, { level: number | null; confident: boolean }>;
    lessonTitles?: Record<string, string>;
    scenarioTitles?: Record<string, string>;
    completedLessons?: Set<string>;
    interviewDate?: Date | null;
    today?: Date;
  } = {},
): JobOfferAnalysis {
  const text = normalize(offerText.slice(0, 20000));
  const detected: DetectedTerm[] = [];
  for (const t of JOB_TERMS) {
    const matched = t.patterns.filter((p) => containsPhrase(text, p));
    if (!matched.length) continue;
    const important = matched.some((m) => isImportant(offerText.slice(0, 20000), m));
    const levels = t.skills.map((s) => opts.skillLevels?.[s]).filter((x): x is { level: number | null; confident: boolean } => Boolean(x && x.level !== null));
    const candidateLevel = levels.length ? Math.round(levels.reduce((a, l) => a + (l.level ?? 0), 0) / levels.length) : null;
    const confident = levels.length > 0 && levels.every((l) => l.confident);
    let status: DetectedTerm["status"] = "non-evalue";
    if (!t.covered) status = "hors-plateforme";
    else if (t.skills.length === 0) status = "non-evalue";
    else if (candidateLevel === null) status = "a-travailler";
    else if (candidateLevel >= 75 && confident) status = "acquis";
    else if (candidateLevel >= 50) status = "a-consolider";
    else status = "a-travailler";
    detected.push({
      id: t.id,
      label: t.label,
      category: t.category,
      matched,
      important,
      covered: t.covered,
      advice: t.advice,
      lessons: t.lessons,
      scenarios: t.scenarios ?? [],
      skills: t.skills,
      candidateLevel,
      status,
    });
  }

  const level = LEVEL_CUES.n2.some((c) => containsPhrase(text, c)) ? "n2" : LEVEL_CUES.n1.some((c) => containsPhrase(text, c)) ? "n1" : "inconnu";
  const junior = LEVEL_CUES.junior.some((c) => containsPhrase(text, c));
  const exp = text.match(/(\d{1,2})\s*(?:a|à)?\s*(?:\d{1,2}\s*)?ans?\s+(?:d\s*)?(?:experience|minimum)/);
  const experienceYears = exp ? Number(exp[1]) : null;
  const english = detected.some((d) => d.id === "anglais");
  const sectors = detected.filter((d) => d.category === "secteur").map((d) => d.id.replace("secteur-", ""));

  const evaluable = detected.filter((d) => d.skills.length && d.covered);
  const readiness = evaluable.length && evaluable.some((d) => d.candidateLevel !== null)
    ? Math.round(evaluable.reduce((a, d) => a + (d.candidateLevel ?? 0) * (d.important ? 2 : 1), 0) / evaluable.reduce((a, d) => a + (d.important ? 2 : 1), 0))
    : null;

  // Plan : les écarts importants d'abord, puis les compétences à consolider.
  const rank = (d: DetectedTerm) => (d.status === "a-travailler" ? 0 : d.status === "a-consolider" ? 1 : d.status === "non-evalue" ? 2 : 3) - (d.important ? 0.5 : 0);
  const todo = detected.filter((d) => d.status !== "acquis" && d.status !== "hors-plateforme" && (d.lessons.length || d.scenarios.length)).sort((a, b) => rank(a) - rank(b));
  const today = opts.today ?? new Date();
  const daysUntil = opts.interviewDate ? Math.ceil((opts.interviewDate.getTime() - today.getTime()) / 86_400_000) : 7;
  const days = Math.max(1, Math.min(14, daysUntil));
  const plan: JobOfferAnalysis["plan"] = [];
  const lessonsQueue = [...new Set(todo.flatMap((d) => d.lessons))].filter((l) => !opts.completedLessons?.has(l));
  const scenarioQueue = [...new Set(todo.flatMap((d) => d.scenarios))];
  const workDays = Math.max(1, days - 1);
  for (let d = 0; d < workDays; d++) {
    const tasks: JobOfferAnalysis["plan"][number]["tasks"] = [];
    const take = Math.ceil(lessonsQueue.length / (workDays - d)) || 0;
    for (const l of lessonsQueue.splice(0, Math.min(2, take))) tasks.push({ kind: "lecon", label: opts.lessonTitles?.[l] ?? l, ref: l });
    const sc = scenarioQueue.shift();
    if (sc) tasks.push({ kind: "labo", label: opts.scenarioTitles?.[sc] ?? sc, ref: sc });
    if (d % 2 === 1 || tasks.length === 0) tasks.push({ kind: "entretien", label: "Simulation d'entretien technique de 15 minutes" });
    plan.push({ day: d + 1, date: dateAt(today, d), focus: todo[d % Math.max(1, todo.length)]?.label ?? "Révision générale", tasks });
  }
  plan.push({
    day: days,
    date: dateAt(today, days - 1),
    focus: "Répétition générale",
    tasks: [
      { kind: "entretien", label: `Simulation d'entretien mixte de 30 minutes${english ? ", dont 2 questions en anglais" : ""}` },
      { kind: "revision", label: "Relire vos trois meilleurs comptes rendus d'incident (portfolio) et préparer vos questions au recruteur" },
    ],
  });

  return {
    detected,
    level,
    junior,
    experienceYears,
    languages: { english },
    sectors,
    readiness,
    plan,
    interviewFocus: { skills: [...new Set(todo.flatMap((d) => d.skills))].slice(0, 6), sectors, english },
    disclaimer:
      "Cette analyse repère des mots-clés et les compare aux compétences que vous avez prouvées sur la plateforme. Elle ne remplace ni la lecture attentive de l'offre ni l'avis d'un recruteur.",
  };
}

function dateAt(base: Date, offsetDays: number) {
  const d = new Date(base.getTime() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}
