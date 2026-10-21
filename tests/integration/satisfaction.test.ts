/** Appréciations de formation : réservées aux apprenants qui ont avancé, une réponse modifiable, rapport sans identité. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { actorOf, createUser, prepareDatabase } from "./helpers";
import { getMySatisfaction, getSatisfactionReport, SatisfactionError, submitSatisfaction } from "@/server/services/satisfaction";
import { ForbiddenError } from "@/server/authz/policies";

describe("satisfaction", () => {
  beforeAll(() => prepareDatabase());

  it("exige d'avoir suivi la moitié de la formation, puis met à jour la réponse", async () => {
    const db = getDb();
    const u = await createUser({ name: "Nom Très Identifiable" });
    const [course] = await db.select().from(s.courses).where(eq(s.courses.slug, "reseau-pour-le-support"));
    const ls = await db
      .select({ id: s.lessons.id })
      .from(s.lessons)
      .innerJoin(s.courseModules, eq(s.courseModules.id, s.lessons.moduleId))
      .where(eq(s.courseModules.courseId, course.id));

    await expect(submitSatisfaction(u, { courseId: course.id, rating: 5, usefulForJob: true, comment: "" })).rejects.toBeInstanceOf(SatisfactionError);
    expect((await getMySatisfaction(u, course.id)).eligible).toBe(false);

    const half = ls.slice(0, Math.ceil(ls.length / 2));
    await db.insert(s.lessonProgress).values(half.map((l) => ({ userId: u, lessonId: l.id, status: "completed" as const, completedAt: new Date() })));
    expect((await getMySatisfaction(u, course.id)).eligible).toBe(true);

    await submitSatisfaction(u, { courseId: course.id, rating: 3, usefulForJob: null, comment: "Premier avis" });
    await submitSatisfaction(u, { courseId: course.id, rating: 4, usefulForJob: true, comment: "Le laboratoire DHCP m'a servi en entretien." });
    const mine = await getMySatisfaction(u, course.id);
    expect(mine.answer?.rating).toBe(4);
    const rows = await db.select().from(s.satisfactionSurveys).where(eq(s.satisfactionSurveys.userId, u));
    expect(rows).toHaveLength(1);

    const student = await actorOf(u);
    await expect(getSatisfactionReport(student)).rejects.toBeInstanceOf(ForbiddenError);
    const lead = await actorOf(await createUser({ role: "pedago_lead" }));
    const report = await getSatisfactionReport(lead);
    expect(report.byCourse.find((c) => c.title === course.title)?.n).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(report)).not.toContain("Nom Très Identifiable");
    expect(JSON.stringify(report)).not.toContain(u);
  });
});
