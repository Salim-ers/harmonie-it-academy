/**
 * Format de contenu pédagogique structuré et versionnable.
 * Une leçon = des métadonnées + une suite de blocs typés. Ce format est stocké tel quel (JSONB)
 * dans lesson_versions.content et édité dans Harmonie Studio.
 */
import { z } from "zod";

export const DIAGRAM_IDS = [
  "support-levels",
  "ticket-lifecycle",
  "priority-matrix",
  "communication-loop",
  "diagnostic-method",
  "itil-practices",
  "windows-tools",
  "powershell-pipeline",
  "computer-anatomy",
  "boot-sequence",
  "print-path",
  "windows-profile",
  "disk-layout",
  "packet-journey",
  "ip-anatomy",
  "subnet-split",
  "dhcp-dora",
  "dns-resolution",
  "osi-layers",
  "tcp-handshake",
  "arp-exchange",
  "wifi-auth",
  "vlan-segmentation",
  "ad-structure",
  "m365-identity",
  "virtualization-layers",
] as const;
export type DiagramId = (typeof DIAGRAM_IDS)[number];

export const SHELLS = ["cmd", "powershell", "bash", "cisco-ios", "text"] as const;

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "identifiant de bloc : minuscules, chiffres, tirets");
const nonEmpty = z.string().trim().min(1);

/* ------------------------------------------------------------------ Grilles de notation (texte libre) */

export const rubricSchema = z.object({
  criteria: z
    .array(
      z.object({
        id,
        label: nonEmpty,
        points: z.number().int().positive(),
        /** Formulations acceptées (insensibles à la casse et aux accents). Une seule suffit. */
        patterns: z.array(nonEmpty).min(1),
        required: z.boolean().optional(),
      }),
    )
    .min(1),
  redFlags: z
    .array(z.object({ id, label: nonEmpty, patterns: z.array(nonEmpty).min(1), penalty: z.number().int().positive() }))
    .optional(),
  passPercent: z.number().int().min(1).max(100).default(60),
});
export type Rubric = z.infer<typeof rubricSchema>;

/* ------------------------------------------------------------------ Questions */

const choice = z.object({ id, text: nonEmpty });

export const questionDataSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("single"), choices: z.array(choice).min(2).max(6), answer: id }),
  z.object({ type: z.literal("multiple"), choices: z.array(choice).min(3).max(7), answer: z.array(id).min(1) }),
  z.object({
    type: z.literal("truefalse"),
    answer: z.boolean(),
    justification: rubricSchema.optional(),
  }),
  z.object({ type: z.literal("order"), items: z.array(choice).min(3).max(8), answer: z.array(id).min(3) }),
  z.object({
    type: z.literal("fill"),
    /** Texte affiché avec "___" à l'emplacement de la réponse. */
    template: nonEmpty,
    accepted: z.array(nonEmpty).min(1),
    caseSensitive: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("match"),
    left: z.array(choice).min(2).max(6),
    right: z.array(choice).min(2).max(8),
    answer: z.record(z.string(), id),
  }),
  z.object({ type: z.literal("text_rubric"), rubric: rubricSchema, minWords: z.number().int().min(0).default(15) }),
]);
export type QuestionData = z.infer<typeof questionDataSchema>;
export type QuestionType = QuestionData["type"];

export const questionFileSchema = z
  .object({
    code: z.string().regex(/^[a-z0-9-]+$/),
    lesson: z.string().optional(),
    skill: z.string(),
    prompt: nonEmpty,
    data: questionDataSchema,
    explanation: z.string().min(40, "une justification de 40 caractères minimum est exigée"),
    difficulty: z.number().int().min(1).max(3).default(1),
    /** Question réservée aux examens (jamais affichée dans les quiz de leçon). */
    examOnly: z.boolean().default(false),
  })
  .superRefine((q, ctx) => {
    const d = q.data;
    const ids = (arr: { id: string }[]) => new Set(arr.map((c) => c.id));
    if (d.type === "single" && !ids(d.choices).has(d.answer)) ctx.addIssue({ code: "custom", message: `${q.code}: answer absente des choix` });
    if (d.type === "multiple" && !d.answer.every((a) => ids(d.choices).has(a)))
      ctx.addIssue({ code: "custom", message: `${q.code}: réponses absentes des choix` });
    if (d.type === "order") {
      const s = ids(d.items);
      if (d.answer.length !== d.items.length || !d.answer.every((a) => s.has(a)))
        ctx.addIssue({ code: "custom", message: `${q.code}: l'ordre attendu doit contenir tous les éléments` });
    }
    if (d.type === "match") {
      const l = ids(d.left);
      const r = ids(d.right);
      if (!Object.entries(d.answer).every(([k, v]) => l.has(k) && r.has(v)) || Object.keys(d.answer).length !== d.left.length)
        ctx.addIssue({ code: "custom", message: `${q.code}: correspondances invalides` });
    }
    if (d.type === "fill" && !d.template.includes("___")) ctx.addIssue({ code: "custom", message: `${q.code}: le gabarit doit contenir ___` });
  });
export type QuestionFile = z.infer<typeof questionFileSchema>;

/* ------------------------------------------------------------------ Blocs de leçon */

const block = <K extends string, T extends z.ZodRawShape>(kind: K, shape: T) =>
  z.object({ id, kind: z.literal(kind), ...shape });

export const blockSchema = z.discriminatedUnion("kind", [
  block("heading", { level: z.union([z.literal(2), z.literal(3)]), text: nonEmpty }),
  /** Texte avec mise en forme légère : **gras**, *italique*, `code`. Aucun HTML. */
  block("paragraph", { text: nonEmpty }),
  block("callout", {
    tone: z.enum(["definition", "analogy", "info", "tip", "warning", "danger", "field"]),
    title: nonEmpty,
    text: nonEmpty,
  }),
  block("list", { ordered: z.boolean().default(false), items: z.array(nonEmpty).min(1) }),
  block("command", {
    shell: z.enum(SHELLS),
    command: nonEmpty,
    /** Explication de la commande et de chaque option. */
    explanation: nonEmpty,
    /** Résultat attendu (extrait réaliste, données fictives). */
    output: z.string().optional(),
    /** Lecture guidée du résultat : chaque note pointe une ligne précise de la sortie. */
    outputNotes: z.array(z.object({ match: nonEmpty, note: nonEmpty })).optional(),
  }),
  block("code", { language: nonEmpty, code: nonEmpty, caption: z.string().optional() }),
  block("table", { caption: z.string().optional(), headers: z.array(nonEmpty).min(2), rows: z.array(z.array(z.string())).min(1) }),
  block("diagram", { diagram: z.enum(DIAGRAM_IDS), caption: nonEmpty }),
  block("steps", {
    title: nonEmpty,
    steps: z.array(z.object({ title: nonEmpty, text: nonEmpty, command: z.string().optional() })).min(2),
  }),
  block("mistakes", { items: z.array(z.object({ mistake: nonEmpty, why: nonEmpty, fix: nonEmpty })).min(2) }),
  block("risks", { items: z.array(nonEmpty).min(1) }),
  block("quiz", { title: z.string().default("Vérifiez votre compréhension"), questions: z.array(z.string()).min(3) }),
  block("exercise", {
    title: nonEmpty,
    context: nonEmpty,
    task: nonEmpty,
    /** Trois niveaux : orienter, proposer une vérification, révéler un élément décisif. */
    hints: z.tuple([nonEmpty, nonEmpty, nonEmpty]),
    /** Correction commentée, en paragraphes. */
    solution: z.array(nonEmpty).min(2),
    /** Optionnel : réponse évaluée automatiquement par une grille. */
    rubric: rubricSchema.optional(),
  }),
  block("interview", {
    questions: z
      .array(z.object({ question: nonEmpty, expectedPoints: z.array(nonEmpty).min(2), modelAnswer: nonEmpty }))
      .min(2),
  }),
  block("glossary", { terms: z.array(z.object({ term: nonEmpty, en: nonEmpty, definition: nonEmpty })).min(1) }),
  block("summary", { points: z.array(nonEmpty).min(3) }),
  block("references", {
    items: z
      .array(
        z.object({
          title: nonEmpty,
          url: z.url(),
          publisher: nonEmpty,
          verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .min(1),
  }),
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockKind = Block["kind"];

export const lessonMetaSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: nonEmpty,
  /** Une phrase qui donne envie et dit ce que l'on saura faire. */
  summary: z.string().min(40).max(240),
  level: z.enum(["debutant", "intermediaire", "avance"]),
  prerequisites: z.array(nonEmpty),
  objectives: z.array(nonEmpty).min(2),
  durationMin: z.number().int().min(5).max(120),
  skills: z.array(z.object({ code: nonEmpty, weight: z.number().int().min(1).max(3) })).min(1),
  next: z.string().optional(),
});

/** Sections exigées par la charte pédagogique (§15 du cahier des charges). */
export const REQUIRED_SECTIONS: { label: string; test: (b: Block[]) => boolean }[] = [
  { label: "définition simple", test: (b) => b.some((x) => x.kind === "callout" && x.tone === "definition") },
  { label: "analogie", test: (b) => b.some((x) => x.kind === "callout" && x.tone === "analogy") },
  { label: "schéma", test: (b) => b.some((x) => x.kind === "diagram") },
  { label: "démonstration pas à pas", test: (b) => b.some((x) => x.kind === "steps") },
  { label: "commande ou outil expliqué", test: (b) => b.some((x) => x.kind === "command" || x.kind === "table") },
  { label: "erreurs fréquentes", test: (b) => b.some((x) => x.kind === "mistakes") },
  { label: "risques et précautions", test: (b) => b.some((x) => x.kind === "risks") },
  { label: "mini-quiz", test: (b) => b.some((x) => x.kind === "quiz") },
  { label: "exercice avec indices et correction", test: (b) => b.some((x) => x.kind === "exercise") },
  { label: "questions d'entretien", test: (b) => b.some((x) => x.kind === "interview") },
  { label: "résumé", test: (b) => b.some((x) => x.kind === "summary") },
  { label: "références datées", test: (b) => b.some((x) => x.kind === "references") },
];

export const lessonDocSchema = z
  .object({ meta: lessonMetaSchema, blocks: z.array(blockSchema).min(12) })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    for (const b of doc.blocks) {
      if (seen.has(b.id)) ctx.addIssue({ code: "custom", message: `${doc.meta.slug}: identifiant de bloc dupliqué « ${b.id} »` });
      seen.add(b.id);
    }
    for (const s of REQUIRED_SECTIONS) {
      if (!s.test(doc.blocks)) ctx.addIssue({ code: "custom", message: `${doc.meta.slug}: section manquante — ${s.label}` });
    }
  });
export type LessonDoc = z.infer<typeof lessonDocSchema>;
