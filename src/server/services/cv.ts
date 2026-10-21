import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { attestations, labSessions, scenarioVersions, scenarios, skillPassports } from "@/server/db/schema";
import { reviewCv, type CvReview } from "@/server/engines/cv-review";
import type { LabReport } from "@/server/engines/scenario-engine";
import { env } from "@/lib/env";
import { getJobAnalysis } from "./career";
import { getSkillMap } from "./skills";

/**
 * Relecture de CV. Le texte du CV n'est **jamais enregistré** : il est analysé en mémoire,
 * le résultat est renvoyé au navigateur, puis tout disparaît. Seules les preuves déjà en base sont lues.
 */
export async function reviewMyCv(userId: string, input: { cvText: string; offerId: string | null }, db: Db = getDb()): Promise<CvReview> {
  const [map, offer, labs, atts, passport] = await Promise.all([
    getSkillMap(userId, db),
    input.offerId ? getJobAnalysis(userId, input.offerId, db) : Promise.resolve(null),
    db
      .select({ title: scenarios.title, report: labSessions.report })
      .from(labSessions)
      .innerJoin(scenarioVersions, eq(scenarioVersions.id, labSessions.scenarioVersionId))
      .innerJoin(scenarios, eq(scenarios.id, scenarioVersions.scenarioId))
      .where(and(eq(labSessions.userId, userId), eq(labSessions.status, "closed")))
      .orderBy(desc(labSessions.score))
      .limit(20),
    db.select({ title: attestations.title, code: attestations.verificationCode }).from(attestations).where(and(eq(attestations.userId, userId), isNull(attestations.revokedAt))),
    db.select().from(skillPassports).where(eq(skillPassports.userId, userId)).limit(1),
  ]);
  const appUrl = env().APP_URL.replace(/\/$/, "");
  const seen = new Set<string>();
  const portfolio = labs
    .filter((l) => (seen.has(l.title) ? false : (seen.add(l.title), true)))
    .map((l) => ({ title: l.title, resolved: Boolean((l.report as LabReport | null)?.resolved) }));
  return reviewCv(input.cvText, {
    skillLevels: Object.fromEntries(map.skills.map((s) => [s.code, { level: s.level, confident: s.confident }])),
    offer: offer?.result ?? null,
    portfolio,
    attestations: atts,
    passportUrl: passport[0]?.enabled ? `${appUrl}/passeport/${passport[0].publicCode}` : null,
    appUrl,
  });
}
