/**
 * Chargement et validation croisée du contenu source (fichiers JSON du dépôt).
 * Utilisé par le script de seed et par les tests — jamais par les pages (elles lisent la base).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { lessonDocSchema, questionFileSchema, type LessonDoc, type QuestionFile } from "./schema";
import { scenarioDefinitionSchema, type ScenarioDefinition } from "./scenario-schema";
import { interviewQuestionFileSchema, type InterviewQuestionFile } from "./career-schema";
import { SKILLS } from "./skills";
import { CATALOG } from "./catalog";
import { EXERCISES } from "./exercises";

const ROOT = join(process.cwd(), "src", "content");

function readJsonDir(dir: string): { file: string; data: unknown }[] {
  const full = join(ROOT, dir);
  let files: string[] = [];
  try {
    files = readdirSync(full).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return files.map((f) => ({ file: `${dir}/${f}`, data: JSON.parse(readFileSync(join(full, f), "utf8")) }));
}

function parseOrThrow<T>(schema: z.ZodType<T>, file: string, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Contenu invalide dans ${file}:\n${msg}`);
  }
  return r.data;
}

export type ContentBundle = {
  lessons: LessonDoc[];
  questions: QuestionFile[];
  scenarios: ScenarioDefinition[];
  interview: InterviewQuestionFile[];
};

export function loadContent(): ContentBundle {
  const lessons = readJsonDir("lessons").map(({ file, data }) => parseOrThrow(lessonDocSchema, file, data));
  const questions = readJsonDir("questions").flatMap(({ file, data }) => parseOrThrow(z.array(questionFileSchema), file, data));
  const scenarios = readJsonDir("scenarios").map(({ file, data }) => parseOrThrow(scenarioDefinitionSchema, file, data));
  const interview = readJsonDir("interview").flatMap(({ file, data }) => parseOrThrow(z.array(interviewQuestionFileSchema), file, data));
  const bundle = { lessons, questions, scenarios, interview };
  const problems = crossCheck(bundle);
  if (problems.length) throw new Error(`Incohérences de contenu :\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  return bundle;
}

export function crossCheck({ lessons, questions, scenarios, interview }: ContentBundle): string[] {
  const problems: string[] = [];
  const skillCodes = new Set(SKILLS.map((s) => s.code));
  const lessonSlugs = new Set(lessons.map((l) => l.meta.slug));
  const questionCodes = new Map<string, QuestionFile>();
  for (const q of questions) {
    if (questionCodes.has(q.code)) problems.push(`question dupliquée : ${q.code}`);
    questionCodes.set(q.code, q);
    if (!skillCodes.has(q.skill)) problems.push(`question ${q.code} : compétence inconnue « ${q.skill} »`);
    if (q.lesson && !lessonSlugs.has(q.lesson)) problems.push(`question ${q.code} : leçon inconnue « ${q.lesson} »`);
  }
  const seenSlugs = new Set<string>();
  for (const l of lessons) {
    if (seenSlugs.has(l.meta.slug)) problems.push(`leçon dupliquée : ${l.meta.slug}`);
    seenSlugs.add(l.meta.slug);
    for (const s of l.meta.skills) if (!skillCodes.has(s.code)) problems.push(`leçon ${l.meta.slug} : compétence inconnue « ${s.code} »`);
    if (l.meta.next && !lessonSlugs.has(l.meta.next)) problems.push(`leçon ${l.meta.slug} : leçon suivante inconnue « ${l.meta.next} »`);
    for (const b of l.blocks) {
      if (b.kind !== "quiz") continue;
      for (const code of b.questions) {
        const q = questionCodes.get(code);
        if (!q) problems.push(`leçon ${l.meta.slug} : question inconnue « ${code} »`);
        else if (q.examOnly) problems.push(`leçon ${l.meta.slug} : la question ${code} est réservée aux examens`);
      }
    }
  }
  const scenarioSlugs = new Set<string>();
  for (const s of scenarios) {
    if (scenarioSlugs.has(s.slug)) problems.push(`scénario dupliqué : ${s.slug}`);
    scenarioSlugs.add(s.slug);
    for (const k of s.skills) if (!skillCodes.has(k)) problems.push(`scénario ${s.slug} : compétence inconnue « ${k} »`);
  }
  const interviewCodes = new Set<string>();
  for (const q of interview) {
    if (interviewCodes.has(q.code)) problems.push(`question d'entretien dupliquée : ${q.code}`);
    interviewCodes.add(q.code);
    for (const k of q.skills) if (!skillCodes.has(k)) problems.push(`entretien ${q.code} : compétence inconnue « ${k} »`);
    for (const l of q.lessonSlugs) if (!lessonSlugs.has(l)) problems.push(`entretien ${q.code} : leçon inconnue « ${l} »`);
  }
  // Le catalogue ne référence que du contenu existant : pas de module fantôme.
  for (const c of CATALOG.courses) {
    for (const m of c.modules) for (const l of m.lessons) if (!lessonSlugs.has(l)) problems.push(`catalogue ${c.slug} : leçon absente « ${l} »`);
  }
  for (const a of [...CATALOG.assessments, ...EXERCISES]) {
    for (const code of a.questions) {
      if (!questionCodes.has(code)) problems.push(`évaluation ${a.slug} : question inconnue « ${code} »`);
    }
  }
  for (const s of CATALOG.scenarioOrder) if (!scenarioSlugs.has(s)) problems.push(`catalogue : scénario absent « ${s} »`);
  // L'examen protégé ne partage aucune question avec l'examen blanc (dont la correction est affichée).
  const exam = CATALOG.assessments.find((a) => a.kind === "exam");
  const mock = CATALOG.assessments.find((a) => a.kind === "mock_exam");
  if (exam && mock) for (const c of exam.questions) if (mock.questions.includes(c)) problems.push(`question ${c} présente à la fois dans l'examen et l'examen blanc`);
  if (exam) for (const c of exam.questions) if (questionCodes.get(c) && !questionCodes.get(c)!.examOnly) problems.push(`examen : la question ${c} n'est pas réservée aux examens`);
  return problems;
}
