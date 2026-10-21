import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { can, ForbiddenError, type Actor } from "@/server/authz/policies";
import { lessonDocSchema, type LessonDoc } from "@/content/schema";
import { recordAudit } from "./audit";
import { upsertEntitlement } from "./entitlements";
import { lessonPlainText as lessonPlainTextForSearch } from "@/content/text";

export class StudioError extends Error {}

/* ---------------------------------------------------------------- Analytics (agrégées, sans donnée individuelle) */

export async function getPlatformAnalytics(actor: Actor, db: Db = getDb()) {
  if (!can.viewPlatformAnalytics(actor)) throw new ForbiddenError();
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const [[users], [newUsers], [subs], [revenue], [tickets]] = await Promise.all([
    db.select({ n: count() }).from(s.user),
    db.select({ n: count() }).from(s.user).where(gte(s.user.createdAt, since30)),
    db.select({ n: count() }).from(s.subscriptions).where(inArray(s.subscriptions.status, ["active", "trialing", "past_due"])),
    db.select({ cents: sql<number>`coalesce(sum(${s.invoices.amountCents}), 0)` }).from(s.invoices).where(and(eq(s.invoices.status, "paid"), gte(s.invoices.createdAt, since30))),
    db.select({ n: count() }).from(s.supportTickets).where(inArray(s.supportTickets.status, ["open", "pending"])),
  ]);
  const lessonFunnel = await db.execute<{ slug: string; title: string; started: number; completed: number; avg_minutes: number }>(sql`
    select l.slug, l.title,
      count(p.user_id)::int as started,
      count(p.user_id) filter (where p.status = 'completed')::int as completed,
      coalesce(round(avg(p.time_spent_sec) / 60.0), 0)::int as avg_minutes
    from lessons l left join lesson_progress p on p.lesson_id = l.id
    group by l.id order by l.position, l.slug
  `);
  const failedQuestions = await db.execute<{ prompt: string; code: string; answers: number; success: number }>(sql`
    select qv.prompt, q.code, count(*)::int as answers, round(100.0 * avg(case when a.is_correct then 1 else 0 end))::int as success
    from answers a join question_versions qv on qv.id = a.question_version_id join questions q on q.id = qv.question_id
    where a.is_correct is not null
    group by qv.id, q.code having count(*) >= 3 order by success asc limit 10
  `);
  const assessmentStats = await db.execute<{ title: string; kind: string; attempts: number; pass_rate: number; avg_percent: number }>(sql`
    select a.title, a.kind, count(t.id)::int as attempts,
      round(100.0 * avg(case when t.passed then 1 else 0 end))::int as pass_rate,
      round(avg(t.percent))::int as avg_percent
    from assessments a join attempts t on t.assessment_id = a.id and t.status = 'submitted'
    where a.kind <> 'lesson_quiz'
    group by a.id order by attempts desc limit 12
  `);
  const [labs] = await db.select({ n: count(), avg: sql<number>`coalesce(round(avg(${s.labSessions.score})), 0)` }).from(s.labSessions).where(eq(s.labSessions.status, "closed"));
  return {
    users: users.n,
    newUsers30: newUsers.n,
    activeSubscriptions: subs.n,
    revenue30Cents: Number(revenue.cents),
    openTickets: tickets.n,
    labsClosed: labs.n,
    labsAvg: Number(labs.avg),
    lessonFunnel: [...lessonFunnel],
    failedQuestions: [...failedQuestions],
    assessmentStats: [...assessmentStats],
  };
}

/* ---------------------------------------------------------------- Contenus et workflow éditorial */

export async function listEditableContent(actor: Actor, db: Db = getDb()) {
  if (!can.accessStudio(actor)) throw new ForbiddenError();
  const courseRows = await db.select().from(s.courses).orderBy(asc(s.courses.position));
  const visible = courseRows.filter((c) => can.editCourse(actor, c.id) || can.publish(actor));
  if (!visible.length) return [];
  const mods = await db.select().from(s.courseModules).where(inArray(s.courseModules.courseId, visible.map((c) => c.id))).orderBy(asc(s.courseModules.position));
  const ls = mods.length ? await db.select().from(s.lessons).where(inArray(s.lessons.moduleId, mods.map((m) => m.id))).orderBy(asc(s.lessons.position)) : [];
  const versions = ls.length
    ? await db
        .select({ lessonId: s.lessonVersions.lessonId, id: s.lessonVersions.id, version: s.lessonVersions.version, status: s.lessonVersions.status, createdAt: s.lessonVersions.createdAt })
        .from(s.lessonVersions)
        .where(inArray(s.lessonVersions.lessonId, ls.map((l) => l.id)))
        .orderBy(desc(s.lessonVersions.version))
    : [];
  return visible.map((c) => ({
    ...c,
    canEdit: can.editCourse(actor, c.id),
    modules: mods
      .filter((m) => m.courseId === c.id)
      .map((m) => ({
        ...m,
        lessons: ls
          .filter((l) => l.moduleId === m.id)
          .map((l) => ({ ...l, latest: versions.find((v) => v.lessonId === l.id) ?? null, pending: versions.filter((v) => v.lessonId === l.id && ["draft", "technical_review", "pedagogical_review"].includes(v.status)).length })),
      })),
  }));
}

async function lessonContext(db: Db, lessonId: string) {
  const [row] = await db
    .select({ lesson: s.lessons, courseId: s.courseModules.courseId })
    .from(s.lessons)
    .innerJoin(s.courseModules, eq(s.courseModules.id, s.lessons.moduleId))
    .where(eq(s.lessons.id, lessonId))
    .limit(1);
  if (!row) throw new StudioError("Leçon introuvable.");
  return row;
}

export async function getLessonForEditing(actor: Actor, lessonId: string, db: Db = getDb()) {
  const { lesson, courseId } = await lessonContext(db, lessonId);
  if (!can.editCourse(actor, courseId) && !can.publish(actor)) throw new ForbiddenError();
  const versions = await db
    .select({ v: s.lessonVersions, authorName: s.user.name })
    .from(s.lessonVersions)
    .leftJoin(s.user, eq(s.user.id, s.lessonVersions.authorId))
    .where(eq(s.lessonVersions.lessonId, lessonId))
    .orderBy(desc(s.lessonVersions.version));
  const reviews = versions.length
    ? await db
        .select({ r: s.editorialReviews, reviewer: s.user.name })
        .from(s.editorialReviews)
        .leftJoin(s.user, eq(s.user.id, s.editorialReviews.reviewerId))
        .where(inArray(s.editorialReviews.lessonVersionId, versions.map((v) => v.v.id)))
        .orderBy(desc(s.editorialReviews.createdAt))
    : [];
  return {
    lesson,
    courseId,
    versions: versions.map((x) => ({ ...x.v, authorName: x.authorName })),
    reviews: reviews.map((x) => ({ ...x.r, reviewerName: x.reviewer })),
    permissions: {
      edit: can.editCourse(actor, courseId),
      publish: can.publish(actor),
    },
  };
}

/** Crée un brouillon à partir de la version publiée (ou de la dernière version). Un seul brouillon ouvert à la fois. */
export async function createDraft(actor: Actor, lessonId: string, db: Db = getDb()) {
  const { courseId } = await lessonContext(db, lessonId);
  if (!can.editCourse(actor, courseId)) throw new ForbiddenError();
  const open = await db
    .select({ id: s.lessonVersions.id })
    .from(s.lessonVersions)
    .where(and(eq(s.lessonVersions.lessonId, lessonId), inArray(s.lessonVersions.status, ["draft", "technical_review", "pedagogical_review"])))
    .limit(1);
  if (open.length) return open[0].id;
  const [latest] = await db.select().from(s.lessonVersions).where(eq(s.lessonVersions.lessonId, lessonId)).orderBy(desc(s.lessonVersions.version)).limit(1);
  if (!latest) throw new StudioError("Aucune version de départ.");
  const [v] = await db
    .insert(s.lessonVersions)
    .values({ lessonId, version: latest.version + 1, content: latest.content, status: "draft", authorId: actor.id, changeNote: "" })
    .returning({ id: s.lessonVersions.id });
  await recordAudit({ actorId: actor.id, action: "content.draft_created", targetType: "lesson_version", targetId: v.id });
  return v.id;
}

async function versionContext(db: Db, versionId: string) {
  const [v] = await db.select().from(s.lessonVersions).where(eq(s.lessonVersions.id, versionId)).limit(1);
  if (!v) throw new StudioError("Version introuvable.");
  const ctx = await lessonContext(db, v.lessonId);
  return { v, ...ctx };
}

export type ValidationIssue = { path: string; message: string };

export function validateLessonDoc(doc: unknown): { ok: true; doc: LessonDoc } | { ok: false; issues: ValidationIssue[] } {
  const r = lessonDocSchema.safeParse(doc);
  if (r.success) return { ok: true, doc: r.data };
  return { ok: false, issues: r.error.issues.slice(0, 30).map((i) => ({ path: i.path.join("."), message: i.message })) };
}

/** Enregistre un brouillon. Un contenu invalide est refusé : on ne stocke jamais une leçon impubliable. */
export async function saveDraft(actor: Actor, versionId: string, doc: unknown, changeNote: string, db: Db = getDb()) {
  const { v, courseId, lesson } = await versionContext(db, versionId);
  if (!can.editCourse(actor, courseId)) throw new ForbiddenError();
  if (v.status !== "draft") throw new StudioError("Seul un brouillon peut être modifié. Renvoyez la version en brouillon pour la corriger.");
  const r = validateLessonDoc(doc);
  if (!r.ok) return r;
  if (r.doc.meta.slug !== lesson.slug) return { ok: false as const, issues: [{ path: "meta.slug", message: `Le slug doit rester « ${lesson.slug} ».` }] };
  await db.update(s.lessonVersions).set({ content: r.doc, changeNote: changeNote.slice(0, 500) }).where(eq(s.lessonVersions.id, versionId));
  return { ok: true as const };
}

const NEXT_STATUS = { submit: "technical_review", technical: "pedagogical_review", pedagogical: "published" } as const;

/**
 * Brouillon → Révision technique → Validation pédagogique → Publication.
 * Chaque transition est vérifiée (rôle, séparation auteur/relecteur) et tracée.
 */
export async function reviewStep(
  actor: Actor,
  versionId: string,
  step: "submit" | "technical" | "pedagogical",
  decision: "approved" | "changes_requested",
  comment: string,
  db: Db = getDb(),
) {
  const { v, courseId, lesson } = await versionContext(db, versionId);
  const expected = { submit: "draft", technical: "technical_review", pedagogical: "pedagogical_review" }[step];
  if (v.status !== expected) throw new StudioError("Cette étape ne correspond pas à l'état actuel de la version.");
  if (step === "submit" && !can.editCourse(actor, courseId)) throw new ForbiddenError();
  if (step === "technical" && !can.technicalReview(actor, courseId, v.authorId)) throw new ForbiddenError("La révision technique doit être faite par un formateur de la formation autre que l'auteur.");
  if (step === "pedagogical" && !can.pedagogicalReview(actor, v.authorId)) throw new ForbiddenError("La validation pédagogique est réservée au responsable pédagogique (autre que l'auteur).");
  if (decision === "changes_requested" && !comment.trim()) throw new StudioError("Expliquez les corrections attendues.");
  if (step === "submit" && decision === "approved") {
    const r = validateLessonDoc(v.content);
    if (!r.ok) throw new StudioError("La version contient des erreurs : corrigez-les avant de la soumettre.");
  }

  await db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    if (decision === "changes_requested") {
      await t.update(s.lessonVersions).set({ status: "draft" }).where(eq(s.lessonVersions.id, versionId));
    } else if (NEXT_STATUS[step] === "published") {
      await t.update(s.lessonVersions).set({ status: "archived" }).where(and(eq(s.lessonVersions.lessonId, v.lessonId), eq(s.lessonVersions.status, "published")));
      await t.update(s.lessonVersions).set({ status: "published", publishedAt: new Date() }).where(eq(s.lessonVersions.id, versionId));
      const doc = v.content as LessonDoc;
      await t.update(s.lessons).set({ publishedVersionId: versionId, title: doc.meta.title, durationMin: doc.meta.durationMin, status: "published", updatedAt: new Date() }).where(eq(s.lessons.id, v.lessonId));
      await t
        .update(s.searchDocuments)
        .set({ title: doc.meta.title, excerpt: doc.meta.summary, body: lessonPlainTextForSearch(doc), updatedAt: new Date() })
        .where(and(eq(s.searchDocuments.kind, "lesson"), eq(s.searchDocuments.refSlug, lesson.slug)));
    } else {
      await t.update(s.lessonVersions).set({ status: NEXT_STATUS[step] }).where(eq(s.lessonVersions.id, versionId));
    }
    await t.insert(s.editorialReviews).values({
      lessonVersionId: versionId,
      reviewerId: actor.id,
      stage: step === "pedagogical" && decision === "approved" ? "publish" : step,
      decision: step === "submit" ? "submitted" : decision === "approved" && step === "pedagogical" ? "published" : decision,
      comment: comment.slice(0, 2000),
    });
  });
  await recordAudit({ actorId: actor.id, action: `content.${step}.${decision}`, targetType: "lesson_version", targetId: versionId, metadata: { lesson: lesson.slug, version: v.version } });
  return { published: step === "pedagogical" && decision === "approved", slug: lesson.slug };
}

export async function listReviewQueue(actor: Actor, db: Db = getDb()) {
  if (!can.accessStudio(actor)) throw new ForbiddenError();
  const rows = await db
    .select({ id: s.lessonVersions.id, status: s.lessonVersions.status, version: s.lessonVersions.version, createdAt: s.lessonVersions.createdAt, lessonId: s.lessons.id, title: s.lessons.title, courseId: s.courseModules.courseId, authorId: s.lessonVersions.authorId, authorName: s.user.name })
    .from(s.lessonVersions)
    .innerJoin(s.lessons, eq(s.lessons.id, s.lessonVersions.lessonId))
    .innerJoin(s.courseModules, eq(s.courseModules.id, s.lessons.moduleId))
    .leftJoin(s.user, eq(s.user.id, s.lessonVersions.authorId))
    .where(inArray(s.lessonVersions.status, ["technical_review", "pedagogical_review", "draft"]))
    .orderBy(asc(s.lessonVersions.createdAt));
  return rows.map((r) => ({
    ...r,
    canAct:
      r.status === "technical_review" ? can.technicalReview(actor, r.courseId, r.authorId) : r.status === "pedagogical_review" ? can.pedagogicalReview(actor, r.authorId) : can.editCourse(actor, r.courseId),
  }));
}

/* ---------------------------------------------------------------- Utilisateurs */

export async function listUsers(actor: Actor, query: string, db: Db = getDb()) {
  if (!can.isStaffRole(actor) || !actor.twoFactorEnabled) throw new ForbiddenError();
  const q = query.trim().slice(0, 80);
  const where = q ? or(ilike(s.user.email, `%${q}%`), ilike(s.user.name, `%${q}%`)) : undefined;
  const rows = await db
    .select({ id: s.user.id, name: s.user.name, email: s.user.email, role: s.user.role, status: s.user.status, createdAt: s.user.createdAt, twoFactorEnabled: s.user.twoFactorEnabled, emailVerified: s.user.emailVerified })
    .from(s.user)
    .where(where)
    .orderBy(desc(s.user.createdAt))
    .limit(100);
  // Un formateur ne voit que les apprenants de ses formations.
  if (actor.role === "trainer" || actor.role === "mentor") {
    const courseIds = actor.courseStaff.map((c) => c.courseId);
    if (!courseIds.length) return [];
    const enrolled = await db.select({ userId: s.enrollments.userId }).from(s.enrollments).where(inArray(s.enrollments.courseId, courseIds));
    const ids = new Set(enrolled.map((e) => e.userId));
    return rows.filter((r) => ids.has(r.id)).map((r) => ({ ...r, email: r.email.replace(/(.{2}).*(@.*)/, "$1…$2") }));
  }
  return rows;
}

export async function setUserRole(actor: Actor, userId: string, role: s.UserRole, db: Db = getDb()) {
  if (!can.changeRole(actor, userId)) throw new ForbiddenError("Seul un super-administrateur peut changer un rôle, et jamais le sien.");
  const [before] = await db.select({ role: s.user.role }).from(s.user).where(eq(s.user.id, userId));
  if (!before) throw new StudioError("Utilisateur introuvable.");
  await db.update(s.user).set({ role, updatedAt: new Date() }).where(eq(s.user.id, userId));
  // Changer de rôle invalide les sessions : la personne se reconnecte avec ses nouveaux droits.
  await db.delete(s.session).where(eq(s.session.userId, userId));
  await recordAudit({ actorId: actor.id, action: "user.role_changed", targetType: "user", targetId: userId, metadata: { from: before.role, to: role } });
}

export async function setUserStatus(actor: Actor, userId: string, status: "active" | "suspended", db: Db = getDb()) {
  if (!can.manageUsers(actor) || actor.id === userId) throw new ForbiddenError();
  await db.update(s.user).set({ status, updatedAt: new Date() }).where(eq(s.user.id, userId));
  if (status === "suspended") await db.delete(s.session).where(eq(s.session.userId, userId));
  await recordAudit({ actorId: actor.id, action: `user.${status}`, targetType: "user", targetId: userId });
}

export async function grantManualAccess(actor: Actor, userId: string, tier: number, until: Date | null, db: Db = getDb()) {
  if (!can.manageBilling(actor)) throw new ForbiddenError();
  await upsertEntitlement(db, { userId, source: "manual", sourceRef: "studio", tier, validUntil: until, active: tier > 0 });
  await recordAudit({ actorId: actor.id, action: "billing.manual_access", targetType: "user", targetId: userId, metadata: { tier, until: until?.toISOString() ?? null } });
}

export async function getLearnerSummary(actor: Actor, userId: string, db: Db = getDb()) {
  const [enr, orgs] = await Promise.all([
    db.select({ courseId: s.enrollments.courseId, organizationId: s.enrollments.organizationId }).from(s.enrollments).where(eq(s.enrollments.userId, userId)),
    db
      .select({ organizationId: s.organizationMembers.organizationId, share: s.organizations.shareResultsWithAdmin })
      .from(s.organizationMembers)
      .innerJoin(s.organizations, eq(s.organizations.id, s.organizationMembers.organizationId))
      .where(eq(s.organizationMembers.userId, userId)),
  ]);
  const learner = { userId, enrolledCourseIds: enr.map((e) => e.courseId), sharingOrganizationIds: orgs.filter((o) => o.share).map((o) => o.organizationId) };
  const allowed = can.viewLearnerResults(actor, learner) || actor.courseStaff.some((c) => can.viewLearnerResults(actor, learner, c.courseId));
  if (!allowed) throw new ForbiddenError();
  if (actor.id !== userId) await recordAudit({ actorId: actor.id, action: "learner.results_viewed", targetType: "user", targetId: userId });
  const [u] = await db.select({ id: s.user.id, name: s.user.name, createdAt: s.user.createdAt }).from(s.user).where(eq(s.user.id, userId));
  const [progress, attempts, labs, [profile]] = await Promise.all([
    db.select({ n: count() }).from(s.lessonProgress).where(and(eq(s.lessonProgress.userId, userId), eq(s.lessonProgress.status, "completed"))),
    db
      .select({ title: s.assessments.title, percent: s.attempts.percent, passed: s.attempts.passed, submittedAt: s.attempts.submittedAt })
      .from(s.attempts)
      .innerJoin(s.assessments, eq(s.assessments.id, s.attempts.assessmentId))
      .where(and(eq(s.attempts.userId, userId), eq(s.attempts.status, "submitted")))
      .orderBy(desc(s.attempts.submittedAt))
      .limit(20),
    db
      .select({ title: s.scenarios.title, score: s.labSessions.score, endedAt: s.labSessions.endedAt })
      .from(s.labSessions)
      .innerJoin(s.scenarioVersions, eq(s.scenarioVersions.id, s.labSessions.scenarioVersionId))
      .innerJoin(s.scenarios, eq(s.scenarios.id, s.scenarioVersions.scenarioId))
      .where(and(eq(s.labSessions.userId, userId), eq(s.labSessions.status, "closed")))
      .orderBy(desc(s.labSessions.endedAt))
      .limit(20),
    db.select({ accessibilityNeeds: s.userProfiles.accessibilityNeeds, placement: s.userProfiles.placement }).from(s.userProfiles).where(eq(s.userProfiles.userId, userId)),
  ]);
  return { user: u, completedLessons: progress[0].n, attempts, labs, accessibilityNeeds: can.publish(actor) ? (profile?.accessibilityNeeds ?? "") : null, placement: profile?.placement ?? null };
}

/* ---------------------------------------------------------------- Organisations (B2B) */

export async function listOrganizations(actor: Actor, db: Db = getDb()) {
  if (!can.manageUsers(actor)) throw new ForbiddenError();
  return db
    .select({ id: s.organizations.id, name: s.organizations.name, slug: s.organizations.slug, seats: s.organizations.seats, members: sql<number>`(select count(*)::int from organization_members m where m.organization_id = ${s.organizations.id})` })
    .from(s.organizations)
    .orderBy(asc(s.organizations.name));
}

export async function createOrganization(actor: Actor, input: { name: string; slug: string; seats: number }, db: Db = getDb()) {
  if (!can.manageUsers(actor)) throw new ForbiddenError();
  const [o] = await db.insert(s.organizations).values(input).returning({ id: s.organizations.id });
  await recordAudit({ actorId: actor.id, action: "org.created", targetType: "organization", targetId: o.id, metadata: { name: input.name } });
  return o.id;
}

/** Rattache un utilisateur existant à une organisation et lui ouvre l'accès Pro tant qu'il en est membre. */
export async function addOrganizationMember(actor: Actor, organizationId: string, email: string, role: "org_admin" | "member", db: Db = getDb()) {
  if (!can.manageOrganizationMembers(actor, organizationId)) throw new ForbiddenError();
  if (role === "org_admin" && !can.manageUsers(actor)) throw new ForbiddenError("Seul Harmonie peut nommer un administrateur d'entreprise.");
  const [org] = await db.select().from(s.organizations).where(eq(s.organizations.id, organizationId));
  const [{ n }] = await db.select({ n: count() }).from(s.organizationMembers).where(eq(s.organizationMembers.organizationId, organizationId));
  if (n >= org.seats) throw new StudioError(`Toutes les places (${org.seats}) sont utilisées.`);
  const [u] = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.email, email.toLowerCase().trim()));
  if (!u) throw new StudioError("Aucun compte avec cette adresse : la personne doit d'abord créer son compte.");
  await db.insert(s.organizationMembers).values({ organizationId, userId: u.id, role }).onConflictDoUpdate({ target: [s.organizationMembers.organizationId, s.organizationMembers.userId], set: { role } });
  await upsertEntitlement(db, { userId: u.id, source: "organization", sourceRef: organizationId, tier: 2, validUntil: null, active: true });
  await recordAudit({ actorId: actor.id, action: "org.member_added", targetType: "organization", targetId: organizationId, metadata: { userId: u.id, role } });
}

export async function removeOrganizationMember(actor: Actor, organizationId: string, userId: string, db: Db = getDb()) {
  if (!can.manageOrganizationMembers(actor, organizationId)) throw new ForbiddenError();
  await db.delete(s.organizationMembers).where(and(eq(s.organizationMembers.organizationId, organizationId), eq(s.organizationMembers.userId, userId)));
  await upsertEntitlement(db, { userId, source: "organization", sourceRef: organizationId, tier: 2, validUntil: null, active: false });
  await recordAudit({ actorId: actor.id, action: "org.member_removed", targetType: "organization", targetId: organizationId, metadata: { userId } });
}

/** Tableau de bord entreprise : uniquement les salariés de l'organisation, et seulement si le partage est activé. */
export async function getOrganizationDashboard(actor: Actor, organizationId: string, db: Db = getDb()) {
  if (!can.viewOrganization(actor, organizationId)) throw new ForbiddenError();
  const [org] = await db.select().from(s.organizations).where(eq(s.organizations.id, organizationId));
  const members = await db
    .select({ userId: s.user.id, name: s.user.name, email: s.user.email, role: s.organizationMembers.role, joinedAt: s.organizationMembers.createdAt })
    .from(s.organizationMembers)
    .innerJoin(s.user, eq(s.user.id, s.organizationMembers.userId))
    .where(eq(s.organizationMembers.organizationId, organizationId))
    .orderBy(asc(s.user.name));
  if (!org.shareResultsWithAdmin) return { org, members: members.map((m) => ({ ...m, completed: null, avgScore: null, labs: null, lastActivity: null })) };
  const ids = members.map((m) => m.userId);
  const stats = ids.length
    ? await db.execute<{ user_id: string; completed: number; avg_score: number | null; labs: number; last_activity: Date | null }>(sql`
        select u.id as user_id,
          (select count(*)::int from lesson_progress p where p.user_id = u.id and p.status = 'completed') as completed,
          (select round(avg(t.percent))::int from attempts t where t.user_id = u.id and t.status = 'submitted') as avg_score,
          (select count(*)::int from lab_sessions l where l.user_id = u.id and l.status = 'closed') as labs,
          (select max(p.updated_at) from lesson_progress p where p.user_id = u.id) as last_activity
        from "user" u where u.id in ${ids}
      `)
    : [];
  const byId = new Map([...stats].map((x) => [x.user_id, x]));
  return {
    org,
    members: members.map((m) => {
      const x = byId.get(m.userId);
      return { ...m, completed: x?.completed ?? 0, avgScore: x?.avg_score ?? null, labs: x?.labs ?? 0, lastActivity: x?.last_activity ?? null };
    }),
  };
}

/* ---------------------------------------------------------------- Réglages et plans */

export async function updateSettings(actor: Actor, values: Record<string, string>, db: Db = getDb()) {
  if (!can.manageSettings(actor)) throw new ForbiddenError();
  for (const [key, value] of Object.entries(values)) {
    await db.insert(s.appSettings).values({ key, value }).onConflictDoUpdate({ target: s.appSettings.key, set: { value, updatedAt: new Date() } });
  }
  await recordAudit({ actorId: actor.id, action: "settings.updated", targetType: "settings", metadata: { keys: Object.keys(values) } });
}

export async function updatePlan(actor: Actor, code: string, input: { name: string; priceCents: number | null; tagline: string; features: string[]; stripePriceId: string | null; active: boolean }, db: Db = getDb()) {
  if (!can.manageBilling(actor)) throw new ForbiddenError();
  await db.update(s.plans).set(input).where(eq(s.plans.code, code));
  await recordAudit({ actorId: actor.id, action: "billing.plan_updated", targetType: "plan", targetId: code, metadata: { priceCents: input.priceCents, stripePriceId: input.stripePriceId } });
}

export async function listAudit(actor: Actor, db: Db = getDb()) {
  if (!can.viewAuditLog(actor)) throw new ForbiddenError();
  return db
    .select({ id: s.auditLogs.id, action: s.auditLogs.action, targetType: s.auditLogs.targetType, targetId: s.auditLogs.targetId, metadata: s.auditLogs.metadata, createdAt: s.auditLogs.createdAt, actorName: s.user.name })
    .from(s.auditLogs)
    .leftJoin(s.user, eq(s.user.id, s.auditLogs.actorId))
    .orderBy(desc(s.auditLogs.createdAt))
    .limit(200);
}

/* ---------------------------------------------------------------- Qualité (préparation Qualiopi) */

export async function getQualityIndicators(actor: Actor, db: Db = getDb()) {
  if (!can.viewPlatformAnalytics(actor)) throw new ForbiddenError();
  const [[learners], [placed], [enrolled], [completedCourses], satisfaction, [complaints], [complaintsClosed], [adapt]] = await Promise.all([
    db.select({ n: count() }).from(s.user).where(eq(s.user.role, "student")),
    db.select({ n: count() }).from(s.userProfiles).where(isNotNull(s.userProfiles.placement)),
    db.select({ n: count() }).from(s.enrollments),
    db.select({ n: count() }).from(s.enrollments).where(eq(s.enrollments.status, "completed")),
    db.select({ avg: sql<number>`round(avg(${s.satisfactionSurveys.rating})::numeric, 2)`, n: count(), useful: sql<number>`round(100.0 * avg(case when ${s.satisfactionSurveys.usefulForJob} then 1 else 0 end))` }).from(s.satisfactionSurveys),
    db.select({ n: count() }).from(s.supportTickets).where(eq(s.supportTickets.category, "reclamation")),
    db.select({ n: count() }).from(s.supportTickets).where(and(eq(s.supportTickets.category, "reclamation"), inArray(s.supportTickets.status, ["resolved", "closed"]))),
    db.select({ n: count() }).from(s.userProfiles).where(sql`length(${s.userProfiles.accessibilityNeeds}) > 0`),
  ]);
  const [exam] = await db.execute<{ attempts: number; pass_rate: number | null }>(sql`
    select count(*)::int as attempts, round(100.0 * avg(case when t.passed then 1 else 0 end))::int as pass_rate
    from attempts t join assessments a on a.id = t.assessment_id where a.kind = 'exam' and t.status = 'submitted'`);
  return {
    learners: learners.n,
    placementRate: learners.n ? Math.round((placed.n / learners.n) * 100) : null,
    enrollments: enrolled.n,
    completionRate: enrolled.n ? Math.round((completedCourses.n / enrolled.n) * 100) : null,
    satisfaction: satisfaction[0],
    complaints: complaints.n,
    complaintsClosed: complaintsClosed.n,
    adaptationRequests: adapt.n,
    exam: exam ?? { attempts: 0, pass_rate: null },
  };
}
