/** Relecture humaine des livrables : offre Pro, plafond, périmètre du mentor, preuve de compétence. */
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { actorOf, createUser, prepareDatabase } from "./helpers";
import { claimSubmission, getAssignmentForLearner, gradeSubmissionReview, listMentorQueue, MentoringError, submitAssignment } from "@/server/services/mentoring";
import { getSkillMap } from "@/server/services/skills";
import { ForbiddenError } from "@/server/authz/policies";

const TEXT = "Symptôme : l'imprimante d'étiquettes du quai 3 n'imprime plus depuis 7 h, 50 colis en attente. ".repeat(6);

describe("livrables relus par un mentor", () => {
  beforeAll(() => prepareDatabase());

  it("parcours complet avec contrôles d'accès", async () => {
    const db = getDb();
    const free = await createUser();
    const pro = await createUser({ tier: 2 });
    await expect(submitAssignment(free, "compte-rendu-incident", TEXT)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(submitAssignment(pro, "compte-rendu-incident", "trop court")).rejects.toBeInstanceOf(MentoringError);

    const id = await submitAssignment(pro, "compte-rendu-incident", TEXT);
    await expect(submitAssignment(pro, "compte-rendu-incident", TEXT)).rejects.toThrow(/attend déjà/);

    // Mentor d'une autre formation : ne voit rien et ne peut rien faire.
    const [itsm] = await db.select().from(s.courses).where(eq(s.courses.slug, "support-metier-itsm"));
    const [other] = await db.select().from(s.courses).where(eq(s.courses.slug, "reseau-pour-le-support"));
    const outsider = await createUser({ role: "mentor" });
    await db.insert(s.courseStaff).values({ courseId: other.id, userId: outsider, role: "mentor" });
    const outsiderActor = await actorOf(outsider);
    expect((await listMentorQueue(outsiderActor)).map((q) => q.id)).not.toContain(id);
    await expect(claimSubmission(outsiderActor, id)).rejects.toBeInstanceOf(ForbiddenError);

    // Mentor de la formation : prend en charge, note, la preuve apparaît.
    const mentor = await createUser({ role: "mentor" });
    await db.insert(s.courseStaff).values({ courseId: itsm.id, userId: mentor, role: "mentor" });
    const m = await actorOf(mentor);
    expect((await listMentorQueue(m)).map((q) => q.id)).toContain(id);
    await expect(gradeSubmissionReview(m, id, { points: [3, 5, 4, 3, 5], feedback: "x".repeat(130) })).rejects.toThrow(/en charge/);
    await claimSubmission(m, id);
    await expect(claimSubmission(m, id)).rejects.toThrow(/déjà pris/);
    await expect(gradeSubmissionReview(m, id, { points: [3, 5, 4, 3], feedback: "x".repeat(130) })).rejects.toThrow(/chaque critère/);
    await expect(gradeSubmissionReview(m, id, { points: [9, 5, 4, 3, 5], feedback: "x".repeat(130) })).rejects.toThrow(/entre 0 et 3/);
    await expect(gradeSubmissionReview(m, id, { points: [3, 5, 4, 3, 5], feedback: "Bien." })).rejects.toThrow(/120 caractères/);
    const score = await gradeSubmissionReview(m, id, { points: [3, 4, 4, 2, 5], feedback: "Compte rendu clair et reprenable. Priorité : décrire comment vous avez vérifié la résolution, avec le test exact et son résultat." });
    expect(score).toBe(90);

    const view = await getAssignmentForLearner(pro, "compte-rendu-incident");
    expect(view?.history[0].status).toBe("reviewed");
    expect(view?.history[0].feedback).toMatch(/Tests listés dans l'ordre avec leur résultat : 4 \/ 5/);
    const ev = await db.select().from(s.skillEvidence).where(and(eq(s.skillEvidence.userId, pro), eq(s.skillEvidence.sourceType, "mentor")));
    expect(ev.length).toBe(2);
    const map = await getSkillMap(pro);
    expect(map.skills.find((k) => k.code === "documentation")?.confident).toBe(true);
    const [notif] = await db.select().from(s.notifications).where(and(eq(s.notifications.userId, pro), eq(s.notifications.kind, "mentor")));
    expect(notif.href).toBe("/campus/livrables/compte-rendu-incident");
  });

  it("plafond mensuel et interdiction de relire son propre livrable", async () => {
    const lead = await createUser({ role: "pedago_lead", tier: 2 });
    const slugs = ["compte-rendu-incident", "article-base-connaissances", "arrivee-collaborateur", "presentation-entretien"];
    const ids = [];
    for (const slug of slugs) ids.push(await submitAssignment(lead, slug, TEXT));
    const leadActor = await actorOf(lead);
    // Son propre livrable n'apparaît pas dans sa file et ne peut pas être pris.
    expect((await listMentorQueue(leadActor)).map((q) => q.id)).not.toContain(ids[0]);
    await expect(claimSubmission(leadActor, ids[0])).rejects.toThrow(/propre livrable/);
    // Cinquième envoi dans les 30 jours : refusé.
    const other = await actorOf(await createUser({ role: "pedago_lead" }));
    await claimSubmission(other, ids[0]);
    await gradeSubmissionReview(other, ids[0], { points: [3, 5, 4, 3, 5], feedback: "y".repeat(130) });
    await expect(submitAssignment(lead, "compte-rendu-incident", TEXT)).rejects.toThrow(/4 relectures/);
  });
});
