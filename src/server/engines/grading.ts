/**
 * Notation des questions — fonctions pures. Les réponses attendues restent côté serveur ;
 * `publicQuestion` produit la seule forme envoyée au navigateur avant soumission.
 */
import { z } from "zod";
import type { QuestionData } from "@/content/schema";
import { gradeText, normalize, type RubricResult } from "./rubric";

export const responseSchemas = {
  single: z.string().max(64),
  multiple: z.array(z.string().max(64)).max(10),
  truefalse: z.object({ value: z.boolean(), justification: z.string().max(2000).optional() }),
  order: z.array(z.string().max(64)).max(10),
  fill: z.string().max(300),
  match: z.record(z.string().max(64), z.string().max(64)),
  text_rubric: z.string().max(5000),
} as const;

export type QuestionResponse = {
  [K in keyof typeof responseSchemas]: z.infer<(typeof responseSchemas)[K]>;
}[keyof typeof responseSchemas];

export type GradeResult = {
  fraction: number;
  correct: boolean;
  /** Détails de correction, affichés après soumission. */
  detail:
    | { type: "single"; expected: string }
    | { type: "multiple"; expected: string[]; missed: string[]; wrong: string[] }
    | { type: "truefalse"; expected: boolean; justification?: RubricResult }
    | { type: "order"; expected: string[]; wellPlaced: number }
    | { type: "fill"; expected: string[] }
    | { type: "match"; expected: Record<string, string>; wrongPairs: string[] }
    | { type: "text_rubric"; rubric: RubricResult };
};

export class InvalidResponseError extends Error {}

export function parseResponse(type: QuestionData["type"], raw: unknown): QuestionResponse {
  const r = responseSchemas[type].safeParse(raw);
  if (!r.success) throw new InvalidResponseError("Réponse au format invalide.");
  return r.data as QuestionResponse;
}

const normFill = (s: string, caseSensitive: boolean) => {
  const t = s.trim().replace(/\s+/g, " ");
  return caseSensitive ? t : normalize(t);
};

export function gradeQuestion(data: QuestionData, raw: unknown): GradeResult {
  const resp = parseResponse(data.type, raw);
  switch (data.type) {
    case "single": {
      const ok = resp === data.answer;
      return { fraction: ok ? 1 : 0, correct: ok, detail: { type: "single", expected: data.answer } };
    }
    case "multiple": {
      const chosen = new Set(resp as string[]);
      const expected = new Set(data.answer);
      const missed = data.answer.filter((a) => !chosen.has(a));
      const wrong = [...chosen].filter((c) => !expected.has(c));
      const step = 1 / data.answer.length;
      const fraction = Math.max(0, Math.min(1, (data.answer.length - missed.length) * step - wrong.length * step));
      return { fraction: round(fraction), correct: missed.length === 0 && wrong.length === 0, detail: { type: "multiple", expected: data.answer, missed, wrong } };
    }
    case "truefalse": {
      const r = resp as { value: boolean; justification?: string };
      const ok = r.value === data.answer;
      if (!data.justification) return { fraction: ok ? 1 : 0, correct: ok, detail: { type: "truefalse", expected: data.answer } };
      const j = gradeText(r.justification ?? "", data.justification, 5);
      const fraction = ok ? 0.5 + 0.5 * (j.percent / 100) : 0;
      return { fraction: round(fraction), correct: ok && j.passed, detail: { type: "truefalse", expected: data.answer, justification: j } };
    }
    case "order": {
      const r = resp as string[];
      const wellPlaced = data.answer.filter((id, i) => r[i] === id).length;
      const exact = wellPlaced === data.answer.length && r.length === data.answer.length;
      return { fraction: round(wellPlaced / data.answer.length), correct: exact, detail: { type: "order", expected: data.answer, wellPlaced } };
    }
    case "fill": {
      const given = normFill(resp as string, data.caseSensitive);
      const ok = data.accepted.some((a) => normFill(a, data.caseSensitive) === given);
      return { fraction: ok ? 1 : 0, correct: ok, detail: { type: "fill", expected: data.accepted } };
    }
    case "match": {
      const r = resp as Record<string, string>;
      const keys = Object.keys(data.answer);
      const wrongPairs = keys.filter((k) => r[k] !== data.answer[k]);
      return { fraction: round((keys.length - wrongPairs.length) / keys.length), correct: wrongPairs.length === 0, detail: { type: "match", expected: data.answer, wrongPairs } };
    }
    case "text_rubric": {
      const g = gradeText(resp as string, data.rubric, data.minWords);
      return { fraction: round(g.percent / 100), correct: g.passed, detail: { type: "text_rubric", rubric: g } };
    }
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Mélange déterministe (même graine = même ordre) : l'ordre affiché ne trahit pas la réponse. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Ne jamais présenter un ordre déjà correct.
  if (out.length > 2 && out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}

export type PublicQuestion =
  | { type: "single" | "multiple"; choices: { id: string; text: string }[] }
  | { type: "truefalse"; withJustification: boolean }
  | { type: "order"; items: { id: string; text: string }[] }
  | { type: "fill"; template: string }
  | { type: "match"; left: { id: string; text: string }[]; right: { id: string; text: string }[] }
  | { type: "text_rubric"; minWords: number };

export function publicQuestion(data: QuestionData, seed: string): PublicQuestion {
  switch (data.type) {
    case "single":
    case "multiple":
      return { type: data.type, choices: data.choices };
    case "truefalse":
      return { type: "truefalse", withJustification: Boolean(data.justification) };
    case "order":
      return { type: "order", items: seededShuffle(data.items, seed) };
    case "fill":
      return { type: "fill", template: data.template };
    case "match":
      return { type: "match", left: data.left, right: seededShuffle(data.right, seed) };
    case "text_rubric":
      return { type: "text_rubric", minWords: data.minWords };
  }
}
