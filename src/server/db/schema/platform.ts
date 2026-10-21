/**
 * Organisations (B2B), carrière, facturation, support, conformité et exploitation.
 */
import {
  boolean,
  date,
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
import { courses } from "./learning";

/* ------------------------------------------------------------------ Organisations (multi-tenant) */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  seats: integer("seats").notNull().default(10),
  /** Les salariés consentent au partage de leurs résultats avec l'administrateur de l'entreprise. */
  shareResultsWithAdmin: boolean("share_results_with_admin").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["org_admin", "member"] }).notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] }), index("org_members_user_idx").on(t.userId)],
);

export const cohorts = pgTable("cohorts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startsOn: date("starts_on"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cohortMembers = pgTable(
  "cohort_members",
  {
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cohortId, t.userId] })],
);

/** Affectation de formations à une entreprise / cohorte. */
export const organizationAssignments = pgTable(
  "organization_assignments",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    dueOn: date("due_on"),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.courseId] })],
);

/* ------------------------------------------------------------------ Profil apprenant */

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  targetRole: text("target_role").notNull().default("support_n1"),
  weeklyGoalMinutes: integer("weekly_goal_minutes").notNull().default(180),
  /** Positionnement initial (score par domaine) — exigence Qualiopi. */
  placement: jsonb("placement").$type<Record<string, number>>(),
  accessibilityNeeds: text("accessibility_needs").notNull().default(""),
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  locale: text("locale").notNull().default("fr"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ Gamification (non compulsive) */

export const xpEvents = pgTable(
  "xp_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    sourceRef: text("source_ref").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Un même objet ne rapporte de l'XP qu'une seule fois : pas de « farming ».
  (t) => [uniqueIndex("xp_events_once_uq").on(t.userId, t.reason, t.sourceRef)],
);

export const userBadges = pgTable(
  "user_badges",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    badgeCode: text("badge_code").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeCode] })],
);

/* ------------------------------------------------------------------ Harmonie Career */

export const interviewQuestions = pgTable("interview_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  role: text("role").notNull(),
  level: text("level").notNull(),
  kind: text("kind", { enum: ["rh", "technique", "situation"] }).notNull(),
  lang: text("lang", { enum: ["fr", "en"] }).notNull().default("fr"),
  sectors: jsonb("sectors").$type<string[]>().notNull().default([]),
  prompt: text("prompt").notNull(),
  rubric: jsonb("rubric").$type<import("@/content/career-schema").InterviewRubric>().notNull(),
  modelAnswer: text("model_answer").notNull(),
  explanation: text("explanation").notNull(),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  lessonSlugs: jsonb("lesson_slugs").$type<string[]>().notNull().default([]),
  estimatedMinutes: integer("estimated_minutes").notNull().default(3),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("published"),
});

export const interviewSessions = pgTable(
  "interview_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    level: text("level").notNull(),
    sector: text("sector").notNull().default("general"),
    kind: text("kind", { enum: ["rh", "technique", "mixte"] }).notNull(),
    lang: text("lang", { enum: ["fr", "en"] }).notNull().default("fr"),
    durationMin: integer("duration_min").notNull(),
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    status: text("status", { enum: ["active", "completed"] }).notNull().default("active"),
    score: integer("score"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("interview_sessions_user_idx").on(t.userId, t.startedAt)],
);

export const interviewAnswers = pgTable(
  "interview_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => interviewSessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => interviewQuestions.id, { onDelete: "restrict" }),
    answer: text("answer").notNull(),
    score: integer("score").notNull(),
    feedback: jsonb("feedback").$type<import("@/server/engines/rubric").RubricResult>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("interview_answers_uq").on(t.sessionId, t.questionId)],
);

/** Analyse d'une offre d'emploi collée par le candidat → écarts de compétences et plan de préparation. */
export const jobAnalyses = pgTable(
  "job_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    offerText: text("offer_text").notNull(),
    result: jsonb("result").$type<import("@/server/engines/job-offer").JobOfferAnalysis>().notNull(),
    interviewDate: date("interview_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("job_analyses_user_idx").on(t.userId, t.createdAt)],
);

/** Passeport de compétences public, désactivé par défaut (opt-in explicite). */
export const skillPassports = pgTable("skill_passports", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  publicCode: text("public_code").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  displayName: text("display_name").notNull(),
  headline: text("headline").notNull().default(""),
  showPortfolio: boolean("show_portfolio").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Attestations internes Harmonie IT Academy (jamais présentées comme diplômes d'État / RNCP). */
export const attestations = pgTable(
  "attestations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["course", "path", "exam"] }).notNull(),
    refSlug: text("ref_slug").notNull(),
    title: text("title").notNull(),
    verificationCode: text("verification_code").notNull().unique(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("attestations_once_uq").on(t.userId, t.kind, t.refSlug)],
);

/* ------------------------------------------------------------------ Facturation (Stripe) */

export const plans = pgTable("plans", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  tier: integer("tier").notNull(),
  priceCents: integer("price_cents"),
  currency: text("currency").notNull().default("eur"),
  interval: text("interval", { enum: ["month", "year", "custom"] }).notNull().default("month"),
  /** Identifiant Price Stripe de l'environnement courant (test ou production). */
  stripePriceId: text("stripe_price_id"),
  tagline: text("tagline").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const billingCustomers = pgTable("billing_customers", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    planCode: text("plan_code").notNull(),
    status: text("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    hostedUrl: text("hosted_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invoices_user_idx").on(t.userId)],
);

/** Droits d'accès effectifs. Seul le serveur (webhooks, admin) les écrit. */
export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["subscription", "organization", "manual"] }).notNull(),
    sourceRef: text("source_ref").notNull(),
    tier: integer("tier").notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("entitlements_source_uq").on(t.userId, t.source, t.sourceRef)],
);

/** Idempotence des webhooks Stripe. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ Support, notifications, médias */

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    category: text("category", {
      enum: ["connexion", "facturation", "exercice_bloque", "correction_contestee", "question_pedagogique", "technique", "reclamation", "accessibilite"],
    }).notNull(),
    subject: text("subject").notNull(),
    status: text("status", { enum: ["open", "pending", "resolved", "closed"] }).notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("support_tickets_user_idx").on(t.userId), index("support_tickets_status_idx").on(t.status)],
);

export const supportMessages = pgTable("support_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => supportTickets.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  storageKey: text("storage_key").notNull().unique(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  visibility: text("visibility", { enum: ["public", "private"] }).notNull().default("private"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ Conformité et exploitation */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    ip: text("ip"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_actor_idx").on(t.actorId)],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["terms", "ai_tutor", "voice_interview", "public_passport", "leaderboard", "org_result_sharing"] }).notNull(),
    granted: boolean("granted").notNull(),
    policyVersion: text("policy_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("consent_records_user_idx").on(t.userId, t.kind)],
);

/** Clé/valeur de configuration éditable depuis le Studio (nom de marque, signature…). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Compteurs de rate limiting applicatif (actions coûteuses : IA, notation libre…). */
export const appRateLimits = pgTable("app_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

export const aiUsage = pgTable(
  "ai_usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    requests: integer("requests").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

/** Boîte d'envoi de développement : n'est jamais écrite en production (voir services/email.ts). */
export const devOutbox = pgTable("dev_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
