import "server-only";
import type { Db } from "@/server/db";
import { userBadges, xpEvents } from "@/server/db/schema";

/**
 * Gamification sobre : l'XP récompense un apprentissage réel (leçon terminée, incident résolu…),
 * chaque objet ne rapporte qu'une fois, sans série obligatoire ni compte à rebours.
 */
export const XP = { lesson_completed: 20, quiz_passed: 10, exercise_passed: 25, scenario_closed: 40, exam_passed: 100, interview_completed: 15 } as const;

export async function awardXp(db: Db, userId: string, reason: keyof typeof XP, sourceRef: string, amount: number = XP[reason]) {
  await db.insert(xpEvents).values({ userId, reason, sourceRef, amount }).onConflictDoNothing();
}

export const BADGES = {
  "premier-incident": { name: "Premier incident résolu", description: "Vous avez clôturé votre premier incident simulé." },
  "methodique": { name: "Méthodique", description: "Un incident résolu avec toutes les vérifications décisives et sans indice." },
  "zero-risque": { name: "Zéro prise de risque", description: "Cinq incidents clôturés sans aucune action dangereuse." },
  "reseau-solide": { name: "Réseau solide", description: "Le domaine Réseau dépasse 80 % avec un niveau confirmé." },
  "pret-entretien": { name: "Prêt pour l'entretien", description: "Une simulation d'entretien complète avec une moyenne d'au moins 70 %." },
  "n1-atteste": { name: "Support N1 attesté", description: "Examen final Support N1 réussi." },
} as const;
export type BadgeCode = keyof typeof BADGES;

export async function awardBadge(db: Db, userId: string, code: BadgeCode) {
  await db.insert(userBadges).values({ userId, badgeCode: code }).onConflictDoNothing();
}
