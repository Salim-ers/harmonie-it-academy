/**
 * Import idempotent du contenu du dépôt dans la base.
 *
 *   npx tsx scripts/seed.ts
 *
 * Règles de préservation des données :
 * - une leçon, une question ou un scénario existants ne sont jamais supprimés ;
 * - une nouvelle version n'est créée que si le contenu du dépôt a changé ;
 * - si une leçon a été modifiée dans Harmonie Studio (version avec auteur), le dépôt ne l'écrase plus ;
 * - les prix, noms de plans et réglages déjà présents ne sont pas réécrits (ils se gèrent dans le Studio).
 */
import "dotenv/config";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "../src/server/db/schema";
import { loadContent } from "../src/content/load";
import { COURSES, PATHS, PLANS, SCENARIO_ORDER, ASSESSMENTS } from "../src/content/catalog";
import { SKILLS } from "../src/content/skills";
import { EXERCISES } from "../src/content/exercises";
import { ASSIGNMENTS } from "../src/content/assignments";
import { lessonPlainText } from "../src/content/text";

const sqlc = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false, onnotice: () => {} });
const db = drizzle(sqlc, { schema: s, casing: "snake_case" });
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Comparaison indépendante de l'ordre des clés (PostgreSQL réordonne les clés JSONB). */
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => [k, canonical((v as Record<string, unknown>)[k])]));
  return v;
}
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

async function seedSkills(tx: Tx) {
  for (const k of SKILLS) {
    await tx
      .insert(s.skills)
      .values(k)
      .onConflictDoUpdate({ target: s.skills.code, set: { name: k.name, domain: k.domain, description: k.description } });
  }
}

async function upsertQuestion(tx: Tx, q: ReturnType<typeof loadContent>["questions"][number], lessonIds: Map<string, string>, skillIds: Map<string, string>) {
  const [existing] = await tx.select().from(s.questions).where(eq(s.questions.code, q.code)).limit(1);
  const lessonId = q.lesson ? lessonIds.get(q.lesson) ?? null : null;
  const skillId = skillIds.get(q.skill) ?? null;
  let questionId = existing?.id;
  if (!questionId) {
    const [row] = await tx.insert(s.questions).values({ code: q.code, lessonId, skillId }).returning({ id: s.questions.id });
    questionId = row.id;
  } else {
    await tx.update(s.questions).set({ lessonId, skillId }).where(eq(s.questions.id, questionId));
  }
  const [latest] = await tx.select().from(s.questionVersions).where(eq(s.questionVersions.questionId, questionId)).orderBy(desc(s.questionVersions.version)).limit(1);
  const payload = { type: q.data.type, prompt: q.prompt, data: q.data, explanation: q.explanation, difficulty: q.difficulty };
  if (latest && same({ type: latest.type, prompt: latest.prompt, data: latest.data, explanation: latest.explanation, difficulty: latest.difficulty }, payload)) {
    return latest.id;
  }
  const [v] = await tx
    .insert(s.questionVersions)
    .values({ questionId, version: (latest?.version ?? 0) + 1, ...payload })
    .returning({ id: s.questionVersions.id });
  await tx.update(s.questions).set({ currentVersionId: v.id }).where(eq(s.questions.id, questionId));
  return v.id;
}

async function syncAssessment(
  tx: Tx,
  a: { slug: string; title: string; description: string; kind: (typeof s.ASSESSMENT_KINDS)[number]; lessonId?: string | null; courseId?: string | null; requiredTier: number; timeLimitMin?: number | null; passPercent: number; maxAttempts?: number | null; isProtected?: boolean },
  versionIds: string[],
) {
  const values = {
    slug: a.slug,
    title: a.title,
    description: a.description,
    kind: a.kind,
    lessonId: a.lessonId ?? null,
    courseId: a.courseId ?? null,
    requiredTier: a.requiredTier,
    timeLimitMin: a.timeLimitMin ?? null,
    passPercent: a.passPercent,
    maxAttempts: a.maxAttempts ?? null,
    isProtected: a.isProtected ?? false,
  };
  const [row] = await tx
    .insert(s.assessments)
    .values(values)
    .onConflictDoUpdate({ target: s.assessments.slug, set: { title: values.title, description: values.description, lessonId: values.lessonId, courseId: values.courseId } })
    .returning({ id: s.assessments.id });
  const current = await tx.select().from(s.assessmentQuestions).where(eq(s.assessmentQuestions.assessmentId, row.id)).orderBy(s.assessmentQuestions.position);
  if (!same(current.map((c) => c.questionVersionId), versionIds)) {
    // Les tentatives passées gardent leurs réponses (elles pointent vers des versions de questions, jamais supprimées).
    await tx.delete(s.assessmentQuestions).where(eq(s.assessmentQuestions.assessmentId, row.id));
    if (versionIds.length) {
      await tx.insert(s.assessmentQuestions).values(versionIds.map((id, i) => ({ assessmentId: row.id, questionVersionId: id, position: i, points: 1 })));
    }
  }
  return row.id;
}

async function main() {
  const content = loadContent();
  const started = Date.now();
  const report = { lessonsCreated: 0, lessonVersions: 0, lessonsProtected: 0, questions: content.questions.length, scenarios: 0 };

  await db.transaction(async (tx) => {
    await seedSkills(tx);
    const skillRows = await tx.select({ id: s.skills.id, code: s.skills.code }).from(s.skills);
    const skillIds = new Map(skillRows.map((r) => [r.code, r.id]));
    const lessonDocs = new Map(content.lessons.map((l) => [l.meta.slug, l]));
    const lessonIds = new Map<string, string>();
    const courseIds = new Map<string, string>();

    for (const [ci, c] of COURSES.entries()) {
      const [course] = await tx
        .insert(s.courses)
        .values({ slug: c.slug, title: c.title, summary: c.summary, school: c.school, level: c.level, requiredTier: c.requiredTier, status: "published", position: ci, objectives: c.objectives })
        .onConflictDoNothing({ target: s.courses.slug })
        .returning({ id: s.courses.id });
      const courseId = course?.id ?? (await tx.select({ id: s.courses.id }).from(s.courses).where(eq(s.courses.slug, c.slug)))[0].id;
      courseIds.set(c.slug, courseId);

      for (const [mi, m] of c.modules.entries()) {
        const [mod] = await tx
          .insert(s.courseModules)
          .values({ courseId, slug: m.slug, title: m.title, position: mi })
          .onConflictDoUpdate({ target: [s.courseModules.courseId, s.courseModules.slug], set: { title: m.title, position: mi } })
          .returning({ id: s.courseModules.id });
        for (const [li, slug] of m.lessons.entries()) {
          const doc = lessonDocs.get(slug)!;
          const free = c.freeLessons?.includes(slug);
          const [existing] = await tx.select().from(s.lessons).where(eq(s.lessons.slug, slug)).limit(1);
          let lessonId = existing?.id;
          if (!lessonId) {
            const [l] = await tx
              .insert(s.lessons)
              .values({ moduleId: mod.id, slug, title: doc.meta.title, position: li, requiredTier: free ? 0 : null, durationMin: doc.meta.durationMin, status: "published" })
              .returning({ id: s.lessons.id });
            lessonId = l.id;
            report.lessonsCreated++;
          }
          lessonIds.set(slug, lessonId);

          const studioEdited = await tx
            .select({ id: s.lessonVersions.id })
            .from(s.lessonVersions)
            .where(and(eq(s.lessonVersions.lessonId, lessonId), isNotNull(s.lessonVersions.authorId)))
            .limit(1);
          if (studioEdited.length) {
            report.lessonsProtected++;
            continue;
          }
          const [latest] = await tx.select().from(s.lessonVersions).where(eq(s.lessonVersions.lessonId, lessonId)).orderBy(desc(s.lessonVersions.version)).limit(1);
          if (!latest || !same(latest.content, doc)) {
            const [v] = await tx
              .insert(s.lessonVersions)
              .values({ lessonId, version: (latest?.version ?? 0) + 1, content: doc, status: "published", changeNote: "Import du dépôt", publishedAt: new Date() })
              .returning({ id: s.lessonVersions.id });
            if (latest) await tx.update(s.lessonVersions).set({ status: "archived" }).where(eq(s.lessonVersions.id, latest.id));
            await tx
              .update(s.lessons)
              .set({ publishedVersionId: v.id, title: doc.meta.title, durationMin: doc.meta.durationMin, updatedAt: new Date() })
              .where(eq(s.lessons.id, lessonId));
            report.lessonVersions++;
          }
          await tx.delete(s.lessonSkills).where(eq(s.lessonSkills.lessonId, lessonId));
          const ls = doc.meta.skills.filter((k) => skillIds.has(k.code)).map((k) => ({ lessonId: lessonId!, skillId: skillIds.get(k.code)!, weight: k.weight }));
          if (ls.length) await tx.insert(s.lessonSkills).values(ls).onConflictDoNothing();
        }
      }
    }

    // Index de recherche + glossaire.
    for (const doc of content.lessons) {
      const lessonId = lessonIds.get(doc.meta.slug);
      if (!lessonId) continue;
      const [l] = await tx.select({ requiredTier: s.lessons.requiredTier, moduleId: s.lessons.moduleId }).from(s.lessons).where(eq(s.lessons.id, lessonId));
      const [c] = await tx.select({ tier: s.courses.requiredTier }).from(s.courses).innerJoin(s.courseModules, eq(s.courseModules.courseId, s.courses.id)).where(eq(s.courseModules.id, l.moduleId));
      const body = lessonPlainText(doc);
      await tx
        .insert(s.searchDocuments)
        .values({ kind: "lesson", refSlug: doc.meta.slug, title: doc.meta.title, excerpt: doc.meta.summary, body, requiredTier: l.requiredTier ?? c.tier })
        .onConflictDoUpdate({ target: [s.searchDocuments.kind, s.searchDocuments.refSlug], set: { title: doc.meta.title, excerpt: doc.meta.summary, body, updatedAt: new Date() } });
      for (const b of doc.blocks) {
        if (b.kind !== "glossary") continue;
        for (const t of b.terms) {
          const slug = t.term
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          await tx
            .insert(s.glossaryTerms)
            .values({ slug, termFr: t.term, termEn: t.en, definition: t.definition, lessonSlug: doc.meta.slug })
            .onConflictDoNothing({ target: s.glossaryTerms.slug });
        }
      }
    }

    // Questions (versionnées).
    const versionByCode = new Map<string, string>();
    for (const q of content.questions) versionByCode.set(q.code, await upsertQuestion(tx, q, lessonIds, skillIds));

    // Quiz de leçon : un par bloc quiz.
    for (const doc of content.lessons) {
      const lessonId = lessonIds.get(doc.meta.slug);
      if (!lessonId) continue;
      const quiz = doc.blocks.find((b) => b.kind === "quiz");
      if (!quiz || quiz.kind !== "quiz") continue;
      const [l] = await tx.select({ requiredTier: s.lessons.requiredTier }).from(s.lessons).where(eq(s.lessons.id, lessonId));
      await syncAssessment(
        tx,
        { slug: `quiz-${doc.meta.slug}`, title: `Quiz — ${doc.meta.title}`, description: quiz.title, kind: "lesson_quiz", lessonId, requiredTier: l.requiredTier ?? 0, passPercent: 60 },
        quiz.questions.map((c) => versionByCode.get(c)!),
      );
    }

    // Exercices, positionnement, examens.
    for (const a of [...EXERCISES, ...ASSESSMENTS]) {
      await syncAssessment(
        tx,
        { ...a, courseId: a.course ? courseIds.get(a.course) ?? null : null },
        a.questions.map((c) => versionByCode.get(c)!),
      );
    }

    // Parcours.
    for (const [pi, p] of PATHS.entries()) {
      const [path] = await tx
        .insert(s.learningPaths)
        .values({ slug: p.slug, title: p.title, summary: p.summary, targetRole: p.targetRole, status: "published", position: pi })
        .onConflictDoUpdate({ target: s.learningPaths.slug, set: { title: p.title, summary: p.summary } })
        .returning({ id: s.learningPaths.id });
      for (const [i, cs] of p.courses.entries()) {
        await tx.insert(s.pathCourses).values({ pathId: path.id, courseId: courseIds.get(cs)!, position: i }).onConflictDoNothing();
      }
    }

    // Scénarios (versionnés).
    for (const [i, slug] of SCENARIO_ORDER.entries()) {
      const def = content.scenarios.find((x) => x.slug === slug)!;
      const [existing] = await tx.select().from(s.scenarios).where(eq(s.scenarios.slug, slug)).limit(1);
      let scenarioId = existing?.id;
      if (!scenarioId) {
        const [row] = await tx
          .insert(s.scenarios)
          .values({ slug, title: def.title, summary: def.summary, sector: def.sector, difficulty: def.difficulty, requiredTier: def.requiredTier, position: i })
          .returning({ id: s.scenarios.id });
        scenarioId = row.id;
      }
      const [latest] = await tx.select().from(s.scenarioVersions).where(eq(s.scenarioVersions.scenarioId, scenarioId)).orderBy(desc(s.scenarioVersions.version)).limit(1);
      if (!latest || !same(latest.definition, def)) {
        const [v] = await tx.insert(s.scenarioVersions).values({ scenarioId, version: (latest?.version ?? 0) + 1, definition: def }).returning({ id: s.scenarioVersions.id });
        await tx.update(s.scenarios).set({ currentVersionId: v.id, title: def.title, summary: def.summary, difficulty: def.difficulty }).where(eq(s.scenarios.id, scenarioId));
        report.scenarios++;
      }
      await tx
        .insert(s.searchDocuments)
        .values({ kind: "scenario", refSlug: slug, title: def.title, excerpt: def.summary, body: `${def.ticket.title}. ${def.ticket.description}`, requiredTier: def.requiredTier })
        .onConflictDoUpdate({ target: [s.searchDocuments.kind, s.searchDocuments.refSlug], set: { title: def.title, excerpt: def.summary, updatedAt: new Date() } });
    }

    // Banque d'entretiens.
    for (const q of content.interview) {
      const values = { ...q };
      await tx
        .insert(s.interviewQuestions)
        .values(values)
        .onConflictDoUpdate({
          target: s.interviewQuestions.code,
          set: { prompt: q.prompt, rubric: q.rubric, modelAnswer: q.modelAnswer, explanation: q.explanation, skills: q.skills, lessonSlugs: q.lessonSlugs, sectors: q.sectors, kind: q.kind, level: q.level, lang: q.lang, role: q.role },
        });
    }

    // Livrables relus par un mentor.
    const skillCodes = new Set(SKILLS.map((k) => k.code));
    for (const a of ASSIGNMENTS) {
      const [course] = await tx.select({ id: s.courses.id }).from(s.courses).where(eq(s.courses.slug, a.courseSlug)).limit(1);
      if (!course) throw new Error(`Livrable ${a.slug} : formation ${a.courseSlug} introuvable.`);
      for (const r of a.rubric) if (!skillCodes.has(r.skill)) throw new Error(`Livrable ${a.slug} : compétence ${r.skill} inconnue.`);
      const values = { slug: a.slug, title: a.title, brief: a.brief, courseId: course.id, rubric: a.rubric, requiredTier: a.requiredTier };
      await tx.insert(s.assignments).values(values).onConflictDoUpdate({ target: s.assignments.slug, set: values });
    }

    // Plans : créés une fois, ensuite gérés dans le Studio.
    for (const [i, p] of PLANS.entries()) {
      await tx
        .insert(s.plans)
        .values({ code: p.code, name: p.name, tier: p.tier, priceCents: p.priceCents, interval: p.interval, tagline: p.tagline, features: p.features, position: i })
        .onConflictDoNothing({ target: s.plans.code });
    }

    // Réglages de marque par défaut (modifiables dans le Studio).
    const defaults: Record<string, unknown> = {
      "brand.name": "Harmonie IT Academy",
      "brand.owner": "Harmonie Solutions",
      "brand.signature": "Apprendre. Pratiquer. Maîtriser.",
      "brand.contactEmail": "contact@example.com",
    };
    for (const [key, value] of Object.entries(defaults)) {
      await tx.insert(s.appSettings).values({ key, value }).onConflictDoNothing({ target: s.appSettings.key });
    }

  });

  console.log(
    `Contenu importé en ${Date.now() - started} ms : ${content.lessons.length} leçons (${report.lessonsCreated} nouvelles, ${report.lessonVersions} versions publiées, ${report.lessonsProtected} protégées car éditées dans le Studio), ${report.questions} questions, ${content.scenarios.length} scénarios (${report.scenarios} versions), ${content.interview.length} questions d'entretien.`,
  );
  await sqlc.end();
}

main().catch(async (e) => {
  console.error(e);
  await sqlc.end();
  process.exit(1);
});
