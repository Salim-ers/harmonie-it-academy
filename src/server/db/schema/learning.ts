/**
 * Catalogue pédagogique, versions de contenu, progression et workflow éditorial.
 */
import { sql } from "drizzle-orm";
import {
  customType,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { date } from "drizzle-orm/pg-core";
import type { LessonDoc } from "@/content/schema";

export const SCHOOLS = ["support", "infrastructure", "security", "cloud", "career"] as const;
export const LEVELS = ["debutant", "intermediaire", "avance"] as const;
export const PUBLISH_STATUS = ["draft", "published", "archived"] as const;
export const VERSION_STATUS = [
  "draft",
  "technical_review",
  "pedagogical_review",
  "published",
  "archived",
] as const;
export type VersionStatus = (typeof VERSION_STATUS)[number];

/** Niveau d'accès : 0 = gratuit, 1 = Academy, 2 = Academy Pro. */
export const TIERS = { free: 0, academy: 1, pro: 2 } as const;

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  description: text("description").notNull().default(""),
});

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    school: text("school", { enum: SCHOOLS }).notNull(),
    level: text("level", { enum: LEVELS }).notNull(),
    requiredTier: integer("required_tier").notNull().default(0),
    status: text("status", { enum: PUBLISH_STATUS }).notNull().default("draft"),
    position: integer("position").notNull().default(0),
    objectives: jsonb("objectives").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("courses_status_idx").on(t.status, t.position)],
);

/** Périmètre des formateurs / mentors : un formateur ne voit que ses formations. */
export const courseStaff = pgTable(
  "course_staff",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["trainer", "mentor"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.userId] }), index("course_staff_user_idx").on(t.userId)],
);

export const courseModules = pgTable(
  "course_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("modules_course_slug_uq").on(t.courseId, t.slug)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => courseModules.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    /** null = hérite du niveau d'accès de la formation. */
    requiredTier: integer("required_tier"),
    publishedVersionId: uuid("published_version_id"),
    durationMin: integer("duration_min").notNull().default(20),
    status: text("status", { enum: PUBLISH_STATUS }).notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lessons_module_idx").on(t.moduleId, t.position)],
);

export const lessonVersions = pgTable(
  "lesson_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: jsonb("content").$type<LessonDoc>().notNull(),
    status: text("status", { enum: VERSION_STATUS }).notNull().default("draft"),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    changeNote: text("change_note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("lesson_versions_uq").on(t.lessonId, t.version), index("lesson_versions_status_idx").on(t.status)],
);

export const editorialReviews = pgTable(
  "editorial_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonVersionId: uuid("lesson_version_id")
      .notNull()
      .references(() => lessonVersions.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id").references(() => user.id, { onDelete: "set null" }),
    stage: text("stage", { enum: ["submit", "technical", "pedagogical", "publish"] }).notNull(),
    decision: text("decision", { enum: ["submitted", "approved", "changes_requested", "published"] }).notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("editorial_reviews_version_idx").on(t.lessonVersionId)],
);

export const lessonSkills = pgTable(
  "lesson_skills",
  {
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    weight: integer("weight").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.skillId] })],
);

export const lessonPrerequisites = pgTable(
  "lesson_prerequisites",
  {
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    requiresLessonId: uuid("requires_lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.requiresLessonId] })],
);

export const learningPaths = pgTable("learning_paths", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  targetRole: text("target_role").notNull(),
  status: text("status", { enum: PUBLISH_STATUS }).notNull().default("draft"),
  position: integer("position").notNull().default(0),
});

export const pathCourses = pgTable(
  "path_courses",
  {
    pathId: uuid("path_id")
      .notNull()
      .references(() => learningPaths.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.pathId, t.courseId] })],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    /** Inscription réalisée via une entreprise cliente (rend les résultats visibles à son admin si autorisé). */
    organizationId: uuid("organization_id"),
    status: text("status", { enum: ["active", "completed", "withdrawn"] }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("enrollments_user_course_uq").on(t.userId, t.courseId), index("enrollments_org_idx").on(t.organizationId)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["started", "completed"] }).notNull().default("started"),
    lastBlockId: text("last_block_id"),
    /** État des exercices intégrés : indices consultés, correction vue, score de la grille. */
    exerciseState: jsonb("exercise_state")
      .$type<Record<string, { hints: number; solutionSeen: boolean; score?: number }>>()
      .notNull()
      .default({}),
    timeSpentSec: integer("time_spent_sec").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] }), index("lesson_progress_user_idx").on(t.userId, t.updatedAt)],
);

/** Notes personnelles et favoris de l'apprenant (privés). */
export const lessonBookmarks = pgTable(
  "lesson_bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/** Index de recherche plein texte (config "french"), alimenté à la publication. */
export const searchDocuments = pgTable(
  "search_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind", { enum: ["lesson", "glossary", "scenario"] }).notNull(),
    refSlug: text("ref_slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull(),
    requiredTier: integer("required_tier").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Colonne générée : la fonction hia_unaccent est créée par la migration 0000 (extension unaccent). */
    tsv: tsvector("tsv").generatedAlwaysAs(
      sql`setweight(to_tsvector('french', hia_unaccent(coalesce(title, ''))), 'A') || setweight(to_tsvector('french', hia_unaccent(coalesce(body, ''))), 'B')`,
    ),
  },
  (t) => [
    uniqueIndex("search_documents_ref_uq").on(t.kind, t.refSlug),
    index("search_documents_tsv_idx").using("gin", t.tsv),
  ],
);

export const contentSources = pgTable("content_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publisher: text("publisher").notNull(),
  license: text("license").notNull().default("Référence consultée — contenu non reproduit"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
});

export const glossaryTerms = pgTable("glossary_terms", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  termFr: text("term_fr").notNull(),
  termEn: text("term_en").notNull(),
  definition: text("definition").notNull(),
  lessonSlug: text("lesson_slug"),
});

/** Appréciation de fin de formation : une réponse par apprenant et par formation, modifiable. */
export const satisfactionSurveys = pgTable(
  "satisfaction_surveys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    usefulForJob: boolean("useful_for_job"),
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("satisfaction_user_course_uq").on(t.userId, t.courseId)],
);

/** Temps d'apprentissage agrégé par jour (objectif hebdomadaire, assiduité). */
export const learningTime = pgTable(
  "learning_time",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    seconds: integer("seconds").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);
