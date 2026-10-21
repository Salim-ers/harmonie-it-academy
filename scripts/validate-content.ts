/**
 * Valide les fichiers de contenu.
 *   npx tsx scripts/validate-content.ts            → valide chaque fichier + vérifications croisées (rapport)
 *   npx tsx scripts/validate-content.ts --strict   → échoue sur toute incohérence (utilisé en CI et avant le seed)
 *   npx tsx scripts/validate-content.ts --only n1-dns,n1-osi → limite le rapport à ces fichiers
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { lessonDocSchema, questionFileSchema } from "../src/content/schema";
import { scenarioDefinitionSchema } from "../src/content/scenario-schema";
import { interviewQuestionFileSchema } from "../src/content/career-schema";
import { crossCheck, type ContentBundle } from "../src/content/load";

const strict = process.argv.includes("--strict");
const onlyArg = process.argv.find((a) => a.startsWith("--only"));
const only = onlyArg ? (onlyArg.includes("=") ? onlyArg.split("=")[1] : process.argv[process.argv.indexOf(onlyArg) + 1]).split(",") : null;

const root = join(process.cwd(), "src", "content");
const dirs: [string, z.ZodType<unknown>, boolean][] = [
  ["lessons", lessonDocSchema, false],
  ["questions", z.array(questionFileSchema), true],
  ["scenarios", scenarioDefinitionSchema, false],
  ["interview", z.array(interviewQuestionFileSchema), true],
];

let errors = 0;
const bundle: ContentBundle = { lessons: [], questions: [], scenarios: [], interview: [] };
for (const [dir, schema, isArray] of dirs) {
  let files: string[] = [];
  try {
    files = readdirSync(join(root, dir)).filter((f) => f.endsWith(".json"));
  } catch {
    continue;
  }
  for (const f of files) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(root, dir, f), "utf8"));
    } catch (e) {
      errors++;
      console.error(`✗ ${dir}/${f} : JSON illisible — ${(e as Error).message}`);
      continue;
    }
    const r = schema.safeParse(data);
    const show = !only || only.some((o) => f.startsWith(o));
    if (!r.success) {
      errors++;
      if (show) {
        console.error(`✗ ${dir}/${f}`);
        for (const i of r.error.issues.slice(0, 25)) console.error(`    ${i.path.join(".")} : ${i.message}`);
      }
      continue;
    }
    if (show) console.log(`✓ ${dir}/${f}`);
    const key = dir as keyof ContentBundle;
    if (isArray) (bundle[key] as unknown[]).push(...(r.data as unknown[]));
    else (bundle[key] as unknown[]).push(r.data);
  }
}

const problems = crossCheck(bundle).filter((p) => !only || only.some((o) => p.includes(o)));
if (problems.length) {
  console.log(`\nVérifications croisées (${problems.length}) :`);
  for (const p of problems) console.log(`  - ${p}`);
}
const words = bundle.lessons.reduce((s, l) => s + JSON.stringify(l.blocks).split(/\s+/).length, 0);
console.log(
  `\n${bundle.lessons.length} leçons (~${words} mots), ${bundle.questions.length} questions, ${bundle.scenarios.length} scénarios, ${bundle.interview.length} questions d'entretien.`,
);
if (errors || (strict && problems.length)) process.exit(1);
