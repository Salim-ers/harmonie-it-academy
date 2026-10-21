import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";

/** Export RGPD (droit d'accès et de portabilité) : toutes les données liées au compte, sans secret technique. */
export async function exportUserData(userId: string) {
  const db = getDb();
  const [u] = await db
    .select({ id: s.user.id, name: s.user.name, email: s.user.email, emailVerified: s.user.emailVerified, createdAt: s.user.createdAt, role: s.user.role, twoFactorEnabled: s.user.twoFactorEnabled })
    .from(s.user)
    .where(eq(s.user.id, userId));
  const att = await db.select().from(s.attempts).where(eq(s.attempts.userId, userId));
  const labs = await db.select().from(s.labSessions).where(eq(s.labSessions.userId, userId));
  const interviews = await db.select().from(s.interviewSessions).where(eq(s.interviewSessions.userId, userId));
  const tickets = await db.select().from(s.supportTickets).where(eq(s.supportTickets.userId, userId));
  return {
    exportedAt: new Date().toISOString(),
    notice: "Export de vos données personnelles Harmonie IT Academy (article 15 et 20 du RGPD).",
    account: u,
    sessions: await db.select({ createdAt: s.session.createdAt, expiresAt: s.session.expiresAt, ipAddress: s.session.ipAddress, userAgent: s.session.userAgent }).from(s.session).where(eq(s.session.userId, userId)),
    linkedAccounts: await db.select({ providerId: s.account.providerId, createdAt: s.account.createdAt }).from(s.account).where(eq(s.account.userId, userId)),
    profile: await db.select().from(s.userProfiles).where(eq(s.userProfiles.userId, userId)),
    consents: await db.select().from(s.consentRecords).where(eq(s.consentRecords.userId, userId)),
    enrollments: await db.select().from(s.enrollments).where(eq(s.enrollments.userId, userId)),
    lessonProgress: await db.select().from(s.lessonProgress).where(eq(s.lessonProgress.userId, userId)),
    learningTime: await db.select().from(s.learningTime).where(eq(s.learningTime.userId, userId)),
    attempts: att,
    answers: att.length ? await db.select().from(s.answers).where(inArray(s.answers.attemptId, att.map((a) => a.id))) : [],
    labs,
    labEvents: labs.length ? await db.select().from(s.scenarioEvents).where(inArray(s.scenarioEvents.labSessionId, labs.map((l) => l.id))) : [],
    interviews,
    interviewAnswers: interviews.length ? await db.select().from(s.interviewAnswers).where(inArray(s.interviewAnswers.sessionId, interviews.map((i) => i.id))) : [],
    jobAnalyses: await db.select().from(s.jobAnalyses).where(eq(s.jobAnalyses.userId, userId)),
    skillEvidence: await db.select().from(s.skillEvidence).where(eq(s.skillEvidence.userId, userId)),
    passport: await db.select().from(s.skillPassports).where(eq(s.skillPassports.userId, userId)),
    attestations: await db.select().from(s.attestations).where(eq(s.attestations.userId, userId)),
    xp: await db.select().from(s.xpEvents).where(eq(s.xpEvents.userId, userId)),
    badges: await db.select().from(s.userBadges).where(eq(s.userBadges.userId, userId)),
    subscriptions: await db.select().from(s.subscriptions).where(eq(s.subscriptions.userId, userId)),
    invoices: await db.select().from(s.invoices).where(eq(s.invoices.userId, userId)),
    supportTickets: tickets,
    supportMessages: tickets.length ? await db.select().from(s.supportMessages).where(inArray(s.supportMessages.ticketId, tickets.map((t) => t.id))) : [],
    notifications: await db.select().from(s.notifications).where(eq(s.notifications.userId, userId)),
    submissions: await db
      .select({ id: s.submissions.id, assignmentId: s.submissions.assignmentId, body: s.submissions.body, status: s.submissions.status, score: s.submissions.score, feedback: s.submissions.feedback, createdAt: s.submissions.createdAt, reviewedAt: s.submissions.reviewedAt })
      .from(s.submissions)
      .where(eq(s.submissions.userId, userId)),
    satisfaction: await db.select().from(s.satisfactionSurveys).where(eq(s.satisfactionSurveys.userId, userId)),
    organizations: await db.select().from(s.organizationMembers).where(eq(s.organizationMembers.userId, userId)),
  };
}
