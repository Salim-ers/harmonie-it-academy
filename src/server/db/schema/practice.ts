/**
 * Évaluations (quiz, exercices, examens), laboratoires simulés et preuves de compétences.
 * Les bonnes réponses ne quittent jamais le serveur avant soumission (voir services/assessments).
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { courses, lessons, skills } from "./learning";
import type { QuestionData } from "@/content/schema";
import type { ScenarioDefinition } from "@/content/scenario-schema";
import type { LabState, LabReport } from "@/server/engines/scenario-engine";

export const QUESTION_TYPES = ["single", "multiple", "truefalse", "order", "fill", "match", "text_rubric"] as const;

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
  skillId: uuid("skill_id").references(() => skills.id, { onDelete: "set null" }),
  currentVersionId: uuid("current_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionVersions = pgTable(
  "question_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    type: text("type", { enum: QUESTION_TYPES }).notNull(),
    prompt: text("prompt").notNull(),
    /** Choix, réponse attendue, grille… Le champ "answer" est retiré avant envoi au navigateur. */
    data: jsonb("data").$type<QuestionData>().notNull(),
    explanation: text("explanation").notNull(),
    difficulty: integer("difficulty").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("question_versions_uq").on(t.questionId, t.version)],
);

export const ASSESSMENT_KINDS = ["lesson_quiz", "module_eval", "exercise", "exam", "placement", "mock_exam"] as const;

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  kind: text("kind", { enum: ASSESSMENT_KINDS }).notNull(),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  requiredTier: integer("required_tier").notNull().default(0),
  timeLimitMin: integer("time_limit_min"),
  passPercent: integer("pass_percent").notNull().default(70),
  maxAttempts: integer("max_attempts"),
  /** Examen protégé : pas de correction détaillée avant la fin, tuteur IA désactivé pendant la tentative. */
  isProtected: boolean("is_protected").notNull().default(false),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("published"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    points: integer("points").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.assessmentId, t.questionVersionId] })],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["in_progress", "submitted", "expired"] }).notNull().default("in_progress"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    score: real("score"),
    maxScore: real("max_score"),
    percent: integer("percent"),
    passed: boolean("passed"),
  },
  (t) => [index("attempts_user_idx").on(t.userId, t.assessmentId)],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "restrict" }),
    response: jsonb("response").$type<unknown>().notNull(),
    isCorrect: boolean("is_correct"),
    points: real("points"),
    maxPoints: real("max_points"),
    hintsUsed: integer("hints_used").notNull().default(0),
    feedback: jsonb("feedback").$type<Record<string, unknown>>(),
  },
  (t) => [uniqueIndex("answers_attempt_question_uq").on(t.attemptId, t.questionVersionId)],
);

/** Travaux à déposer pour correction humaine (projets, comptes rendus). */
export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  rubric: jsonb("rubric").$type<{ criterion: string; points: number; skill?: string }[]>().notNull().default([]),
  requiredTier: integer("required_tier").notNull().default(1),
});

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    assetId: uuid("asset_id"),
    status: text("status", { enum: ["submitted", "in_review", "reviewed"] }).notNull().default("submitted"),
    score: real("score"),
    feedback: text("feedback"),
    reviewerId: text("reviewer_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("submissions_user_idx").on(t.userId), index("submissions_status_idx").on(t.status)],
);

export const scenarios = pgTable("scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  sector: text("sector").notNull(),
  difficulty: integer("difficulty").notNull().default(1),
  requiredTier: integer("required_tier").notNull().default(0),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("published"),
  currentVersionId: uuid("current_version_id"),
  position: integer("position").notNull().default(0),
});

export const scenarioVersions = pgTable(
  "scenario_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    definition: jsonb("definition").$type<ScenarioDefinition>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("scenario_versions_uq").on(t.scenarioId, t.version)],
);

/** Une session de laboratoire = un incident traité par un apprenant. */
export const labSessions = pgTable(
  "lab_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scenarioVersionId: uuid("scenario_version_id")
      .notNull()
      .references(() => scenarioVersions.id, { onDelete: "restrict" }),
    status: text("status", { enum: ["active", "closed", "abandoned"] }).notNull().default("active"),
    state: jsonb("state").$type<LabState>().notNull(),
    score: integer("score"),
    report: jsonb("report").$type<LabReport>(),
    /** L'apprenant accepte d'afficher ce compte rendu dans son portfolio public. */
    inPortfolio: boolean("in_portfolio").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("lab_sessions_user_idx").on(t.userId, t.startedAt)],
);

export const scenarioEvents = pgTable(
  "scenario_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    labSessionId: uuid("lab_session_id")
      .notNull()
      .references(() => labSessions.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type", { enum: ["action", "hint", "diagnosis", "resolution", "close"] }).notNull(),
    refId: text("ref_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("scenario_events_seq_uq").on(t.labSessionId, t.seq)],
);

/**
 * Preuves de compétence : chaque résultat évalué alimente une ligne.
 * Le niveau affiché est calculé à partir de ces preuves (services/skills.ts), jamais saisi à la main.
 */
export const EVIDENCE_SOURCES = ["quiz", "exercise", "exam", "scenario", "interview", "mentor"] as const;

export const skillEvidence = pgTable(
  "skill_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    sourceType: text("source_type", { enum: EVIDENCE_SOURCES }).notNull(),
    sourceId: text("source_id").notNull(),
    score: integer("score").notNull(),
    weight: real("weight").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("skill_evidence_user_skill_idx").on(t.userId, t.skillId, t.createdAt),
    uniqueIndex("skill_evidence_source_uq").on(t.userId, t.skillId, t.sourceType, t.sourceId),
  ],
);
