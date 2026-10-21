import { z } from "zod";
import { rubricSchema } from "./schema";

export const INTERVIEW_ROLES = [
  "support_n1",
  "support_n2",
  "support_n3",
  "technicien_proximite",
  "support_industriel",
  "admin_windows",
  "admin_linux",
  "admin_reseaux",
  "admin_cybersecurite",
  "soc_junior",
  "admin_cloud",
  "devops_junior",
] as const;
export type InterviewRole = (typeof INTERVIEW_ROLES)[number];

export const ROLE_LABELS: Record<InterviewRole, string> = {
  support_n1: "Technicien support N1",
  support_n2: "Technicien support N2",
  support_n3: "Spécialiste support N3",
  technicien_proximite: "Technicien de proximité",
  support_industriel: "Support informatique industriel",
  admin_windows: "Administrateur Windows",
  admin_linux: "Administrateur Linux",
  admin_reseaux: "Administrateur réseaux",
  admin_cybersecurite: "Administrateur cybersécurité",
  soc_junior: "Analyste SOC junior",
  admin_cloud: "Administrateur cloud",
  devops_junior: "DevOps junior",
};

export const interviewRubricSchema = rubricSchema.extend({
  /** Pour les questions comportementales : vérifier la présence d'une structure Situation → Action → Résultat. */
  expectStructure: z.boolean().default(false),
});
export type InterviewRubric = z.infer<typeof interviewRubricSchema>;

export const interviewQuestionFileSchema = z.object({
  code: z.string().regex(/^[a-z0-9-]+$/),
  role: z.enum(INTERVIEW_ROLES),
  level: z.enum(["debutant", "intermediaire", "avance"]),
  kind: z.enum(["rh", "technique", "situation"]),
  lang: z.enum(["fr", "en"]),
  sectors: z.array(z.string()).default([]),
  prompt: z.string().min(10),
  rubric: interviewRubricSchema,
  modelAnswer: z.string().min(80),
  explanation: z.string().min(40),
  skills: z.array(z.string()).min(1),
  lessonSlugs: z.array(z.string()).default([]),
  estimatedMinutes: z.number().int().min(1).max(10).default(3),
});
export type InterviewQuestionFile = z.infer<typeof interviewQuestionFileSchema>;
