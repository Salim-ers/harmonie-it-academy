import "server-only";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { answers, assessmentQuestions, assessments, attempts, questionVersions, questions, skills, attestations, userProfiles } from "@/server/db/schema";
import { SKILLS } from "@/content/skills";
import { gradeQuestion, parseResponse, publicQuestion, type GradeResult, type PublicQuestion } from "@/server/engines/grading";
import type { QuestionData } from "@/content/schema";
import { ForbiddenError } from "@/server/authz/policies";
import { getUserTier } from "./entitlements";
import { recordEvidence } from "./skills";
import { awardBadge, awardXp } from "./xp";
import { randomCode } from "@/lib/codes";

export class AssessmentError extends Error {}

type LoadedQuestion = {
  questionVersionId: string;
  position: number;
  points: number;
  type: QuestionData["type"];
  prompt: string;
  data: QuestionData;
  explanation: string;
  skillCode: string | null;
};

async function loadQuestions(db: Db, assessmentId: string): Promise<LoadedQuestion[]> {
  const rows = await db
    .select({
      questionVersionId: assessmentQuestions.questionVersionId,
      position: assessmentQuestions.position,
      points: assessmentQuestions.points,
      type: questionVersions.type,
      prompt: questionVersions.prompt,
      data: questionVersions.data,
      explanation: questionVersions.explanation,
      skillCode: skills.code,
    })
    .from(assessmentQuestions)
    .innerJoin(questionVersions, eq(questionVersions.id, assessmentQuestions.questionVersionId))
    .innerJoin(questions, eq(questions.id, questionVersions.questionId))
    .leftJoin(skills, eq(skills.id, questions.skillId))
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(assessmentQuestions.position));
  return rows as LoadedQuestion[];
}

async function getAssessment(db: Db, slug: string) {
  const [a] = await db.select().from(assessments).where(and(eq(assessments.slug, slug), eq(assessments.status, "published"))).limit(1);
  if (!a) throw new AssessmentError("Évaluation introuvable.");
  return a;
}

export type AttemptQuestionView = {
  id: string;
  position: number;
  prompt: string;
  question: PublicQuestion;
  savedResponse: unknown | null;
  result?: { fraction: number; correct: boolean; points: number; maxPoints: number; explanation: string; detail: GradeResult["detail"]; hidden?: boolean };
  skill?: string | null;
};

export type AttemptView = {
  attemptId: string;
  assessment: { slug: string; title: string; description: string; kind: string; passPercent: number; timeLimitMin: number | null; isProtected: boolean };
  status: "in_progress" | "submitted" | "expired";
  deadlineAt: string | null;
  percent: number | null;
  passed: boolean | null;
  questions: AttemptQuestionView[];
  attestationCode?: string | null;
};

/** Vérifie que la tentative appartient à l'utilisateur (protection IDOR) et la charge. */
async function ownedAttempt(db: Db, userId: string, attemptId: string) {
  const [att] = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!att || att.userId !== userId) throw new ForbiddenError("Cette tentative n'existe pas ou ne vous appartient pas.");
  return att;
}

export async function startAttempt(userId: string, slug: string, db: Db = getDb()) {
  const a = await getAssessment(db, slug);
  const tier = await getUserTier(userId, db);
  if (tier < a.requiredTier) throw new ForbiddenError("Cette évaluation fait partie d'une offre supérieure.");
  const [open] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.assessmentId, a.id), eq(attempts.status, "in_progress")))
    .orderBy(desc(attempts.startedAt))
    .limit(1);
  if (open) {
    if (open.deadlineAt && open.deadlineAt < new Date()) {
      await finalizeAttempt(db, userId, open.id, { expired: true });
    } else {
      return open.id;
    }
  }
  if (a.maxAttempts) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.assessmentId, a.id), inArray(attempts.status, ["submitted", "expired"])));
    if (n >= a.maxAttempts) throw new AssessmentError(`Vous avez utilisé vos ${a.maxAttempts} tentatives pour cette évaluation.`);
  }
  const deadlineAt = a.timeLimitMin ? new Date(Date.now() + a.timeLimitMin * 60_000) : null;
  const [row] = await db.insert(attempts).values({ assessmentId: a.id, userId, deadlineAt }).returning({ id: attempts.id });
  return row.id;
}

export async function getAttemptView(userId: string, attemptId: string, db: Db = getDb()): Promise<AttemptView> {
  let att = await ownedAttempt(db, userId, attemptId);
  if (att.status === "in_progress" && att.deadlineAt && att.deadlineAt < new Date()) {
    await finalizeAttempt(db, userId, att.id, { expired: true });
    att = await ownedAttempt(db, userId, attemptId);
  }
  const [a] = await db.select().from(assessments).where(eq(assessments.id, att.assessmentId));
  const qs = await loadQuestions(db, a.id);
  const saved = await db.select().from(answers).where(eq(answers.attemptId, att.id));
  const byQ = new Map(saved.map((s) => [s.questionVersionId, s]));
  const done = att.status !== "in_progress";
  let attestationCode: string | null = null;
  if (done && a.kind === "exam" && att.passed) {
    const [at] = await db.select({ code: attestations.verificationCode }).from(attestations).where(and(eq(attestations.userId, userId), eq(attestations.refSlug, a.slug))).limit(1);
    attestationCode = at?.code ?? null;
  }
  return {
    attemptId: att.id,
    assessment: { slug: a.slug, title: a.title, description: a.description, kind: a.kind, passPercent: a.passPercent, timeLimitMin: a.timeLimitMin, isProtected: a.isProtected },
    status: att.status,
    deadlineAt: att.deadlineAt?.toISOString() ?? null,
    percent: att.percent,
    passed: att.passed,
    attestationCode,
    questions: qs.map((q) => {
      const s = byQ.get(q.questionVersionId);
      const view: AttemptQuestionView = {
        id: q.questionVersionId,
        position: q.position,
        prompt: q.prompt,
        question: publicQuestion(q.data, `${att.id}:${q.questionVersionId}`),
        savedResponse: s?.response ?? null,
        skill: done ? q.skillCode : null,
      };
      if (done && a.isProtected) {
        // Examen protégé : on indique juste/faux sans révéler la réponse attendue (la banque sert aux tentatives suivantes).
        const fraction = s?.maxPoints ? (s.points ?? 0) / s.maxPoints : 0;
        view.result = { fraction, correct: Boolean(s?.isCorrect), points: s?.points ?? 0, maxPoints: s?.maxPoints ?? q.points, explanation: "", detail: { type: "fill", expected: [] }, hidden: true };
      } else if (done && s && s.points !== null) {
        view.result = {
          fraction: s.maxPoints ? (s.points ?? 0) / s.maxPoints : 0,
          correct: Boolean(s.isCorrect),
          points: s.points ?? 0,
          maxPoints: s.maxPoints ?? q.points,
          explanation: q.explanation,
          detail: (s.feedback as GradeResult["detail"]) ?? gradeQuestion(q.data, s.response).detail,
        };
      } else if (done) {
        view.result = { fraction: 0, correct: false, points: 0, maxPoints: q.points, explanation: q.explanation, detail: emptyDetail(q.data) };
      }
      return view;
    }),
  };
}

function emptyDetail(data: QuestionData): GradeResult["detail"] {
  switch (data.type) {
    case "single":
      return { type: "single", expected: data.answer };
    case "multiple":
      return { type: "multiple", expected: data.answer, missed: data.answer, wrong: [] };
    case "truefalse":
      return { type: "truefalse", expected: data.answer };
    case "order":
      return { type: "order", expected: data.answer, wellPlaced: 0 };
    case "fill":
      return { type: "fill", expected: data.accepted };
    case "match":
      return { type: "match", expected: data.answer, wrongPairs: Object.keys(data.answer) };
    case "text_rubric":
      return { type: "text_rubric", rubric: { score: 0, maxScore: 0, percent: 0, passed: false, matched: [], missing: data.rubric.criteria.map((c) => ({ id: c.id, label: c.label, points: c.points, required: Boolean(c.required) })), redFlags: [], wordCount: 0, tooShort: true } };
  }
}

export async function saveAnswer(userId: string, attemptId: string, questionVersionId: string, response: unknown, db: Db = getDb()) {
  const att = await ownedAttempt(db, userId, attemptId);
  if (att.status !== "in_progress") throw new AssessmentError("Cette tentative est terminée.");
  if (att.deadlineAt && att.deadlineAt < new Date()) throw new AssessmentError("Le temps imparti est écoulé.");
  const qs = await loadQuestions(db, att.assessmentId);
  const q = qs.find((x) => x.questionVersionId === questionVersionId);
  if (!q) throw new AssessmentError("Question inconnue pour cette évaluation.");
  const parsed = parseResponse(q.data.type, response);
  await db
    .insert(answers)
    .values({ attemptId, questionVersionId, response: parsed })
    .onConflictDoUpdate({ target: [answers.attemptId, answers.questionVersionId], set: { response: parsed } });
}

/** Note la tentative, enregistre les preuves de compétences, l'XP et l'éventuelle attestation. */
export async function finalizeAttempt(db: Db, userId: string, attemptId: string, opts: { expired?: boolean } = {}) {
  return db.transaction(async (tx) => {
    const [att] = await tx.select().from(attempts).where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId))).for("update");
    if (!att) throw new ForbiddenError();
    if (att.status !== "in_progress") return att;
    const [a] = await tx.select().from(assessments).where(eq(assessments.id, att.assessmentId));
    const qs = await loadQuestions(tx as unknown as Db, a.id);
    const saved = await tx.select().from(answers).where(eq(answers.attemptId, att.id));
    const byQ = new Map(saved.map((s) => [s.questionVersionId, s]));
    let score = 0;
    let max = 0;
    const perSkill = new Map<string, { got: number; max: number }>();
    for (const q of qs) {
      max += q.points;
      const s = byQ.get(q.questionVersionId);
      let fraction = 0;
      if (s) {
        const g = gradeQuestion(q.data, s.response);
        fraction = g.fraction;
        await tx
          .update(answers)
          .set({ isCorrect: g.correct, points: g.fraction * q.points, maxPoints: q.points, feedback: g.detail as unknown as Record<string, unknown> })
          .where(eq(answers.id, s.id));
      }
      score += fraction * q.points;
      if (q.skillCode) {
        const cur = perSkill.get(q.skillCode) ?? { got: 0, max: 0 };
        perSkill.set(q.skillCode, { got: cur.got + fraction * q.points, max: cur.max + q.points });
      }
    }
    const percent = max ? Math.round((score / max) * 100) : 0;
    const passed = percent >= a.passPercent;
    const [updated] = await tx
      .update(attempts)
      .set({ status: opts.expired ? "expired" : "submitted", submittedAt: new Date(), score, maxScore: max, percent, passed })
      .where(eq(attempts.id, att.id))
      .returning();

    const sourceType = a.kind === "exam" || a.kind === "mock_exam" ? "exam" : a.kind === "exercise" ? "exercise" : "quiz";
    if (a.kind !== "placement") {
      await recordEvidence(
        tx as unknown as Db,
        userId,
        sourceType,
        a.id,
        [...perSkill.entries()].map(([skillCode, v]) => ({ skillCode, score: v.max ? (v.got / v.max) * 100 : 0 })),
      );
    }
    if (a.kind === "placement") {
      // Positionnement initial : score par domaine, utilisé pour adapter le parcours (traçabilité Qualiopi).
      const byDomain = new Map<string, { got: number; max: number }>();
      for (const [code, v] of perSkill) {
        const domain = SKILLS.find((k) => k.code === code)?.domain ?? "autre";
        const cur = byDomain.get(domain) ?? { got: 0, max: 0 };
        byDomain.set(domain, { got: cur.got + v.got, max: cur.max + v.max });
      }
      const placement = Object.fromEntries([...byDomain].map(([d, v]) => [d, v.max ? Math.round((v.got / v.max) * 100) : 0]));
      await tx
        .insert(userProfiles)
        .values({ userId, placement })
        .onConflictDoUpdate({ target: userProfiles.userId, set: { placement, updatedAt: new Date() } });
    }
    if (passed) {
      if (a.kind === "lesson_quiz") await awardXp(tx as unknown as Db, userId, "quiz_passed", a.id);
      if (a.kind === "exercise") await awardXp(tx as unknown as Db, userId, "exercise_passed", a.id);
      if (a.kind === "exam") {
        await awardXp(tx as unknown as Db, userId, "exam_passed", a.id);
        await awardBadge(tx as unknown as Db, userId, "n1-atteste");
        await tx
          .insert(attestations)
          .values({ userId, kind: "exam", refSlug: a.slug, title: `Attestation interne de réussite — ${a.title.replace(/^Examen final — /, "")}`, verificationCode: randomCode(10), details: { percent, attemptId: att.id, passPercent: a.passPercent } })
          .onConflictDoNothing();
      }
    }
    return updated;
  });
}

export async function submitAttempt(userId: string, attemptId: string, db: Db = getDb()) {
  const att = await ownedAttempt(db, userId, attemptId);
  if (att.status !== "in_progress") throw new AssessmentError("Cette tentative est déjà terminée.");
  await finalizeAttempt(db, userId, attemptId, { expired: Boolean(att.deadlineAt && att.deadlineAt < new Date()) });
  return getAttemptView(userId, attemptId, db);
}

/** Quiz intégré à une leçon : création, enregistrement des réponses et notation en une fois. */
export async function submitInlineQuiz(userId: string, slug: string, responses: Record<string, unknown>, db: Db = getDb()) {
  const attemptId = await startAttempt(userId, slug, db);
  const view = await getAttemptView(userId, attemptId, db);
  for (const q of view.questions) {
    if (q.id in responses) await saveAnswer(userId, attemptId, q.id, responses[q.id], db);
  }
  return submitAttempt(userId, attemptId, db);
}

/** Version publique d'un quiz (aucune réponse) pour l'afficher avant toute tentative. */
export async function getPublicQuiz(slug: string, db: Db = getDb()) {
  const a = await getAssessment(db, slug);
  const qs = await loadQuestions(db, a.id);
  return {
    slug: a.slug,
    title: a.title,
    description: a.description,
    kind: a.kind,
    requiredTier: a.requiredTier,
    questions: qs.map((q) => ({ id: q.questionVersionId, prompt: q.prompt, question: publicQuestion(q.data, `public:${q.questionVersionId}`) })),
  };
}

export async function getAttemptHistory(userId: string, db: Db = getDb()) {
  return db
    .select({ id: attempts.id, slug: assessments.slug, title: assessments.title, kind: assessments.kind, status: attempts.status, percent: attempts.percent, passed: attempts.passed, submittedAt: attempts.submittedAt, startedAt: attempts.startedAt })
    .from(attempts)
    .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.startedAt))
    .limit(50);
}
