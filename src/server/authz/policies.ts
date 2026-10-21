/**
 * Politiques d'autorisation — fonctions pures et testées.
 * Toute action serveur appelle l'une d'elles avant de lire ou d'écrire une donnée d'un tiers.
 * Règle par défaut : refus.
 */
import type { UserRole } from "@/server/db/schema/auth";

export type Actor = {
  id: string;
  role: UserRole;
  status: "active" | "suspended";
  twoFactorEnabled: boolean;
  organizations: { organizationId: string; role: "org_admin" | "member" }[];
  courseStaff: { courseId: string; role: "trainer" | "mentor" }[];
};

/** Ce que l'on sait d'un apprenant au moment de décider si quelqu'un peut voir ses résultats. */
export type LearnerContext = {
  userId: string;
  /** Organisations dont l'apprenant est membre ET qui ont activé le partage des résultats. */
  sharingOrganizationIds: string[];
  /** Formations auxquelles l'apprenant est inscrit. */
  enrolledCourseIds: string[];
};

export const STAFF_ROLES: UserRole[] = ["trainer", "mentor", "pedago_lead", "super_admin"];

const active = (a: Actor | null | undefined): a is Actor => Boolean(a && a.status === "active");
const isAdmin = (a: Actor) => a.role === "super_admin";
const isLead = (a: Actor) => a.role === "pedago_lead" || a.role === "super_admin";
const staffOf = (a: Actor, courseId: string, roles: ("trainer" | "mentor")[] = ["trainer", "mentor"]) =>
  a.courseStaff.some((s) => s.courseId === courseId && roles.includes(s.role));

export const can = {
  /** L'accès au Studio exige un rôle d'équipe ET la double authentification activée. */
  accessStudio: (a: Actor | null) => active(a) && STAFF_ROLES.includes(a.role) && a.twoFactorEnabled,
  isStaffRole: (a: Actor | null) => active(a) && STAFF_ROLES.includes(a.role),

  manageUsers: (a: Actor | null) => active(a) && isAdmin(a) && a.twoFactorEnabled,
  changeRole: (a: Actor | null, targetUserId: string) => active(a) && isAdmin(a) && a.twoFactorEnabled && a.id !== targetUserId,
  manageSettings: (a: Actor | null) => active(a) && isAdmin(a) && a.twoFactorEnabled,
  manageBilling: (a: Actor | null) => active(a) && isAdmin(a) && a.twoFactorEnabled,
  viewAuditLog: (a: Actor | null) => active(a) && isAdmin(a) && a.twoFactorEnabled,
  viewPlatformAnalytics: (a: Actor | null) => active(a) && isLead(a) && a.twoFactorEnabled,
  manageSupportTickets: (a: Actor | null) => active(a) && (isLead(a) || a.role === "mentor") && a.twoFactorEnabled,

  createCourse: (a: Actor | null) => active(a) && isLead(a) && a.twoFactorEnabled,
  /** Un formateur ne modifie que les formations qui lui sont affectées (brouillons uniquement). */
  editCourse: (a: Actor | null, courseId: string) =>
    active(a) && a.twoFactorEnabled && (isLead(a) || (a.role === "trainer" && staffOf(a, courseId, ["trainer"]))),
  technicalReview: (a: Actor | null, courseId: string, authorId: string | null) =>
    active(a) && a.twoFactorEnabled && a.id !== authorId && (isLead(a) || (a.role === "trainer" && staffOf(a, courseId, ["trainer"]))),
  /** La validation pédagogique et la publication sont réservées au responsable pédagogique. */
  pedagogicalReview: (a: Actor | null, authorId: string | null) => active(a) && a.twoFactorEnabled && isLead(a) && (a.id !== authorId || isAdmin(a)),
  publish: (a: Actor | null) => active(a) && a.twoFactorEnabled && isLead(a),

  /** Résultats, tentatives, compte rendus de labo, réponses d'entretien d'un apprenant. */
  viewLearnerResults: (a: Actor | null, learner: LearnerContext, courseId?: string) => {
    if (!active(a)) return false;
    if (a.id === learner.userId) return true;
    if (!a.twoFactorEnabled && a.role !== "student") return false;
    if (isLead(a)) return true;
    if ((a.role === "trainer" || a.role === "mentor") && courseId && learner.enrolledCourseIds.includes(courseId) && staffOf(a, courseId)) return true;
    return a.organizations.some((o) => o.role === "org_admin" && learner.sharingOrganizationIds.includes(o.organizationId));
  },
  gradeSubmission: (a: Actor | null, courseId: string | null) =>
    active(a) && a.twoFactorEnabled && (isLead(a) || (courseId !== null && (a.role === "mentor" || a.role === "trainer") && staffOf(a, courseId))),

  viewOrganization: (a: Actor | null, organizationId: string) =>
    active(a) && (isAdmin(a) || a.organizations.some((o) => o.organizationId === organizationId && o.role === "org_admin")),
  manageOrganizationMembers: (a: Actor | null, organizationId: string) =>
    active(a) && (isAdmin(a) || a.organizations.some((o) => o.organizationId === organizationId && o.role === "org_admin")),
};

/** Erreur levée par les actions serveur : le message est sûr à afficher (aucune donnée interne). */
export class ForbiddenError extends Error {
  constructor(message = "Vous n'avez pas accès à cette ressource.") {
    super(message);
  }
}

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) throw new ForbiddenError(message);
}
