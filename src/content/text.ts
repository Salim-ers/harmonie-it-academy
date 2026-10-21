/** Texte brut d'une leçon, pour l'index de recherche plein texte. */
import type { Block, LessonDoc } from "./schema";

export function lessonPlainText(doc: LessonDoc): string {
  const parts: string[] = [];
  const strip = (t: string) => t.replace(/\*\*|`|\*/g, "");
  for (const b of doc.blocks as Block[]) {
    switch (b.kind) {
      case "heading":
      case "paragraph":
        parts.push(strip(b.text));
        break;
      case "callout":
        parts.push(strip(`${b.title}. ${b.text}`));
        break;
      case "list":
        parts.push(...b.items.map(strip));
        break;
      case "command":
        parts.push(b.command, strip(b.explanation));
        break;
      case "table":
        parts.push(b.headers.join(" "), ...b.rows.map((r) => r.join(" ")));
        break;
      case "steps":
        parts.push(...b.steps.map((x) => `${x.title}. ${strip(x.text)}`));
        break;
      case "glossary":
        parts.push(...b.terms.map((t) => `${t.term} ${t.en} ${t.definition}`));
        break;
      case "summary":
        parts.push(...b.points.map(strip));
        break;
      default:
        break;
    }
  }
  return parts.join("\n");
}
