/**
 * Définition d'un incident simulé (Harmonie Labs).
 *
 * Le moteur est déterministe : la cause réelle est fixée par l'auteur, et chaque action
 * renvoie le premier « outcome » dont les conditions (drapeaux d'état) sont satisfaites.
 * Ainsi chaque test retourne un résultat cohérent avec la cause et avec ce que l'apprenant
 * a déjà corrigé. La définition complète ne quitte jamais le serveur.
 */
import { z } from "zod";
import { rubricSchema } from "./schema";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const nonEmpty = z.string().trim().min(1);
const flags = z.array(id).default([]);

export const ACTION_CATEGORIES = ["interroger", "observer", "tester", "consulter", "corriger", "escalader"] as const;

const condition = z.object({ all: flags.optional(), none: flags.optional() });

const outcome = z.object({
  when: condition.optional(),
  text: nonEmpty,
  /** Sortie de console affichée telle quelle (données fictives). */
  terminal: z.object({ shell: z.enum(["cmd", "powershell", "bash", "cisco-ios", "text"]), lines: z.array(z.string()).min(1) }).optional(),
  reveals: flags.optional(),
  setFlags: flags.optional(),
  clearFlags: flags.optional(),
});

export const scenarioActionSchema = z.object({
  id,
  label: nonEmpty,
  category: z.enum(ACTION_CATEGORIES),
  /** Temps simulé consommé (minutes), comparé au SLA. */
  minutes: z.number().int().min(0).max(240),
  /** key = test décisif attendu ; useful = pertinent ; neutral ; irrelevant = hors sujet. */
  relevance: z.enum(["key", "useful", "neutral", "irrelevant"]),
  /** L'action n'apparaît que lorsque ces conditions sont remplies (ex. : retest après correction). */
  availableWhen: condition.optional(),
  risk: z.object({ level: z.enum(["caution", "dangerous"]), explanation: nonEmpty }).optional(),
  outcomes: z.array(outcome).min(1),
});
export type ScenarioAction = z.infer<typeof scenarioActionSchema>;

export const scenarioDefinitionSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: nonEmpty,
    summary: z.string().min(30).max(240),
    sector: z.enum(["bureau", "logistique", "industrie", "retail-luxe", "sante", "hotellerie", "banque", "education"]),
    difficulty: z.number().int().min(1).max(3),
    requiredTier: z.number().int().min(0).max(2),
    estimatedMinutes: z.number().int().min(5).max(90),
    skills: z.array(nonEmpty).min(1),
    company: z.object({ name: nonEmpty, description: nonEmpty }),
    ticket: z.object({
      reference: nonEmpty,
      reporter: z.object({ name: nonEmpty, role: nonEmpty, site: nonEmpty }),
      channel: z.enum(["telephone", "portail", "email", "chat", "sur-site"]),
      title: nonEmpty,
      description: nonEmpty,
      impact: z.enum(["individuel", "service", "site", "entreprise"]),
      urgency: z.enum(["faible", "moyenne", "haute"]),
      slaMinutes: z.number().int().positive(),
    }),
    startFlags: flags,
    clues: z.array(z.object({ id, label: nonEmpty })).min(2),
    actions: z.array(scenarioActionSchema).min(8),
    diagnoses: z
      .array(z.object({ id, label: nonEmpty, correct: z.boolean(), feedback: nonEmpty, requiresClues: flags.optional() }))
      .min(3),
    resolutions: z
      .array(
        z.object({
          id,
          label: nonEmpty,
          correct: z.boolean(),
          feedback: nonEmpty,
          setFlags: flags.optional(),
          /** Prérequis de procédure (ex. identité vérifiée) : sans eux, la résolution est refusée avec ce message. */
          requires: z.object({ all: z.array(id).min(1), message: nonEmpty }).optional(),
        }),
      )
      .min(3),
    /** Drapeau qui signifie « le service est rétabli ». */
    fixedFlag: id,
    /** Action de validation à réaliser après correction (ex. : impression test). */
    verificationActionId: id,
    closureRubric: rubricSchema,
    hints: z.tuple([nonEmpty, nonEmpty, nonEmpty]),
    debrief: z.object({
      cause: nonEmpty,
      clues: z.array(nonEmpty).min(2),
      relevantTests: z.array(nonEmpty).min(2),
      wrongHypotheses: z.array(z.object({ hypothesis: nonEmpty, why: nonEmpty })).min(2),
      procedure: z.array(nonEmpty).min(3),
      prevention: z.array(nonEmpty).min(1),
      exampleClosingNote: nonEmpty,
    }),
  })
  .superRefine((def, ctx) => {
    const actionIds = new Set(def.actions.map((a) => a.id));
    const clueIds = new Set(def.clues.map((c) => c.id));
    if (!actionIds.has(def.verificationActionId))
      ctx.addIssue({ code: "custom", message: `${def.slug}: verificationActionId inconnu` });
    if (!def.diagnoses.some((d) => d.correct)) ctx.addIssue({ code: "custom", message: `${def.slug}: aucun diagnostic correct` });
    if (!def.resolutions.some((r) => r.correct && r.setFlags?.includes(def.fixedFlag)))
      ctx.addIssue({ code: "custom", message: `${def.slug}: une résolution correcte doit poser fixedFlag` });
    if (!def.actions.some((a) => a.relevance === "key")) ctx.addIssue({ code: "custom", message: `${def.slug}: aucune action décisive` });
    for (const a of def.actions) {
      for (const o of a.outcomes) {
        for (const r of o.reveals ?? []) {
          if (!clueIds.has(r)) ctx.addIssue({ code: "custom", message: `${def.slug}/${a.id}: indice inconnu « ${r} »` });
        }
      }
      const last = a.outcomes[a.outcomes.length - 1];
      if (last.when && (last.when.all?.length || last.when.none?.length))
        ctx.addIssue({ code: "custom", message: `${def.slug}/${a.id}: le dernier outcome doit être inconditionnel (cas par défaut)` });
    }
  });
export type ScenarioDefinition = z.infer<typeof scenarioDefinitionSchema>;
