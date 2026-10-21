import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { skillEvidence, skills } from "@/server/db/schema";
import { SKILL_DOMAINS, type SkillDomain } from "@/content/skills";

/**
 * Méthode de calcul affichée aux apprenants (page Compétences) :
 * - chaque résultat évalué produit une preuve (0–100) pour les compétences concernées ;
 * - une nouvelle tentative remplace la preuve précédente de la même source ;
 * - le niveau d'une compétence = moyenne des preuves pondérée par leur type ;
 * - en dessous d'un poids total de 3, le niveau est « à confirmer ».
 */
export const EVIDENCE_WEIGHTS = { quiz: 1, exercise: 1.5, interview: 1, scenario: 2, exam: 3, mentor: 3 } as const;
export const MIN_CONFIDENT_WEIGHT = 3;

export type EvidenceInput = { skillCode: string; score: number };

export async function recordEvidence(
  db: Db,
  userId: string,
  sourceType: keyof typeof EVIDENCE_WEIGHTS,
  sourceId: string,
  items: EvidenceInput[],
) {
  if (!items.length) return;
  const codes = [...new Set(items.map((i) => i.skillCode))];
  const rows = await db.select({ id: skills.id, code: skills.code }).from(skills).where(inArray(skills.code, codes));
  const idByCode = new Map(rows.map((r) => [r.code, r.id]));
  for (const item of items) {
    const skillId = idByCode.get(item.skillCode);
    if (!skillId) continue;
    const score = Math.max(0, Math.min(100, Math.round(item.score)));
    await db
      .insert(skillEvidence)
      .values({ userId, skillId, sourceType, sourceId, score, weight: EVIDENCE_WEIGHTS[sourceType] })
      .onConflictDoUpdate({
        target: [skillEvidence.userId, skillEvidence.skillId, skillEvidence.sourceType, skillEvidence.sourceId],
        set: { score, createdAt: new Date() },
      });
  }
}

export type SkillLevel = {
  code: string;
  name: string;
  domain: SkillDomain;
  level: number | null;
  evidenceCount: number;
  totalWeight: number;
  confident: boolean;
  bySource: Partial<Record<keyof typeof EVIDENCE_WEIGHTS, number>>;
};

export type SkillMap = {
  skills: SkillLevel[];
  domains: { domain: SkillDomain; label: string; level: number | null; confident: boolean; evidenceCount: number }[];
};

export function computeSkillMap(
  allSkills: { code: string; name: string; domain: string }[],
  evidence: { code: string; score: number; weight: number; sourceType: keyof typeof EVIDENCE_WEIGHTS }[],
): SkillMap {
  const levels: SkillLevel[] = allSkills.map((s) => {
    const ev = evidence.filter((e) => e.code === s.code);
    const totalWeight = ev.reduce((a, e) => a + e.weight, 0);
    const level = totalWeight ? Math.round(ev.reduce((a, e) => a + e.score * e.weight, 0) / totalWeight) : null;
    const bySource: SkillLevel["bySource"] = {};
    for (const e of ev) bySource[e.sourceType] = (bySource[e.sourceType] ?? 0) + 1;
    return { code: s.code, name: s.name, domain: s.domain as SkillDomain, level, evidenceCount: ev.length, totalWeight, confident: totalWeight >= MIN_CONFIDENT_WEIGHT, bySource };
  });
  const domains = (Object.keys(SKILL_DOMAINS) as SkillDomain[]).map((d) => {
    const inDomain = levels.filter((l) => l.domain === d && l.level !== null);
    const w = inDomain.reduce((a, l) => a + l.totalWeight, 0);
    return {
      domain: d,
      label: SKILL_DOMAINS[d],
      level: w ? Math.round(inDomain.reduce((a, l) => a + (l.level ?? 0) * l.totalWeight, 0) / w) : null,
      confident: w >= MIN_CONFIDENT_WEIGHT,
      evidenceCount: inDomain.reduce((a, l) => a + l.evidenceCount, 0),
    };
  });
  return { skills: levels, domains };
}

export async function getSkillMap(userId: string, db: Db = getDb()): Promise<SkillMap> {
  const [all, ev] = await Promise.all([
    db.select({ code: skills.code, name: skills.name, domain: skills.domain }).from(skills),
    db
      .select({ code: skills.code, score: skillEvidence.score, weight: skillEvidence.weight, sourceType: skillEvidence.sourceType })
      .from(skillEvidence)
      .innerJoin(skills, eq(skills.id, skillEvidence.skillId))
      .where(and(eq(skillEvidence.userId, userId))),
  ]);
  return computeSkillMap(all, ev);
}
