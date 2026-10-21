import { describe, expect, it } from "vitest";
import { can, type Actor, type LearnerContext } from "@/server/authz/policies";

const base = (over: Partial<Actor>): Actor => ({
  id: "u1",
  role: "student",
  status: "active",
  twoFactorEnabled: false,
  organizations: [],
  courseStaff: [],
  ...over,
});
const learner: LearnerContext = { userId: "learner", sharingOrganizationIds: ["org-a"], enrolledCourseIds: ["c1"] };

describe("politiques d'accès", () => {
  it("un apprenant voit ses propres résultats et jamais ceux d'un autre", () => {
    expect(can.viewLearnerResults(base({ id: "learner" }), learner)).toBe(true);
    expect(can.viewLearnerResults(base({ id: "other" }), learner)).toBe(false);
    expect(can.viewLearnerResults(base({ id: "other" }), learner, "c1")).toBe(false);
  });

  it("un formateur ne voit que les apprenants de ses formations, et seulement avec la MFA", () => {
    const trainer = base({ id: "t", role: "trainer", twoFactorEnabled: true, courseStaff: [{ courseId: "c1", role: "trainer" }] });
    expect(can.viewLearnerResults(trainer, learner, "c1")).toBe(true);
    expect(can.viewLearnerResults(trainer, learner, "c2")).toBe(false);
    expect(can.viewLearnerResults(trainer, learner)).toBe(false);
    expect(can.viewLearnerResults({ ...trainer, twoFactorEnabled: false }, learner, "c1")).toBe(false);
  });

  it("un formateur ne modifie pas une formation qui ne lui est pas affectée", () => {
    const trainer = base({ id: "t", role: "trainer", twoFactorEnabled: true, courseStaff: [{ courseId: "c1", role: "trainer" }] });
    expect(can.editCourse(trainer, "c1")).toBe(true);
    expect(can.editCourse(trainer, "c2")).toBe(false);
    const mentor = base({ id: "m", role: "mentor", twoFactorEnabled: true, courseStaff: [{ courseId: "c1", role: "mentor" }] });
    expect(can.editCourse(mentor, "c1")).toBe(false);
    expect(can.publish(trainer)).toBe(false);
  });

  it("l'administrateur d'entreprise ne voit que les salariés de son organisation qui partagent leurs résultats", () => {
    const orgAdmin = base({ id: "oa", organizations: [{ organizationId: "org-a", role: "org_admin" }] });
    expect(can.viewLearnerResults(orgAdmin, learner)).toBe(true);
    expect(can.viewLearnerResults(orgAdmin, { ...learner, sharingOrganizationIds: ["org-b"] })).toBe(false);
    const member = base({ id: "mm", organizations: [{ organizationId: "org-a", role: "member" }] });
    expect(can.viewLearnerResults(member, learner)).toBe(false);
    expect(can.viewOrganization(orgAdmin, "org-a")).toBe(true);
    expect(can.viewOrganization(orgAdmin, "org-b")).toBe(false);
  });

  it("le Studio exige un rôle d'équipe et la double authentification", () => {
    expect(can.accessStudio(base({ role: "student", twoFactorEnabled: true }))).toBe(false);
    expect(can.accessStudio(base({ role: "pedago_lead", twoFactorEnabled: false }))).toBe(false);
    expect(can.accessStudio(base({ role: "pedago_lead", twoFactorEnabled: true }))).toBe(true);
  });

  it("un compte suspendu n'a plus aucun droit", () => {
    const admin = base({ role: "super_admin", twoFactorEnabled: true, status: "suspended" });
    expect(can.manageUsers(admin)).toBe(false);
    expect(can.viewLearnerResults({ ...admin, id: "learner" }, learner)).toBe(false);
  });

  it("séparation des tâches : on ne relit pas son propre contenu", () => {
    const trainer = base({ id: "t", role: "trainer", twoFactorEnabled: true, courseStaff: [{ courseId: "c1", role: "trainer" }] });
    expect(can.technicalReview(trainer, "c1", "t")).toBe(false);
    expect(can.technicalReview(trainer, "c1", "autre")).toBe(true);
    const lead = base({ id: "l", role: "pedago_lead", twoFactorEnabled: true });
    expect(can.pedagogicalReview(lead, "l")).toBe(false);
    expect(can.pedagogicalReview(lead, "t")).toBe(true);
  });

  it("un super-admin ne peut pas modifier son propre rôle", () => {
    const admin = base({ id: "a", role: "super_admin", twoFactorEnabled: true });
    expect(can.changeRole(admin, "a")).toBe(false);
    expect(can.changeRole(admin, "b")).toBe(true);
  });
});
