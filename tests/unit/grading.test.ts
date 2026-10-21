import { describe, expect, it } from "vitest";
import { gradeQuestion, publicQuestion, seededShuffle, InvalidResponseError } from "@/server/engines/grading";
import { gradeText, containsPhrase, normalize } from "@/server/engines/rubric";
import type { QuestionData } from "@/content/schema";

const single: QuestionData = { type: "single", choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answer: "b" };
const multiple: QuestionData = {
  type: "multiple",
  choices: [{ id: "ip", text: "" }, { id: "gw", text: "" }, { id: "dns", text: "" }, { id: "pwd", text: "" }],
  answer: ["ip", "gw", "dns"],
};

describe("notation des questions", () => {
  it("choix unique : juste ou faux", () => {
    expect(gradeQuestion(single, "b")).toMatchObject({ fraction: 1, correct: true });
    expect(gradeQuestion(single, "a")).toMatchObject({ fraction: 0, correct: false });
  });

  it("choix multiples : crédit partiel et pénalité des mauvais choix", () => {
    expect(gradeQuestion(multiple, ["ip", "gw", "dns"]).fraction).toBe(1);
    expect(gradeQuestion(multiple, ["ip", "gw"]).fraction).toBeCloseTo(0.667, 2);
    expect(gradeQuestion(multiple, ["ip", "gw", "dns", "pwd"]).fraction).toBeCloseTo(0.667, 2);
    expect(gradeQuestion(multiple, ["pwd"]).fraction).toBe(0);
    expect(gradeQuestion(multiple, ["ip", "gw", "dns", "pwd"]).correct).toBe(false);
  });

  it("ordre : proportion d'éléments bien placés", () => {
    const q: QuestionData = { type: "order", items: ["d", "o", "r", "a"].map((id) => ({ id, text: id })), answer: ["d", "o", "r", "a"] };
    expect(gradeQuestion(q, ["d", "o", "r", "a"])).toMatchObject({ fraction: 1, correct: true });
    expect(gradeQuestion(q, ["d", "o", "a", "r"]).fraction).toBe(0.5);
  });

  it("texte à compléter : insensible à la casse et aux espaces", () => {
    const q: QuestionData = { type: "fill", template: "ipconfig ___", accepted: ["/renew"], caseSensitive: false };
    expect(gradeQuestion(q, "  /RENEW ").correct).toBe(true);
    expect(gradeQuestion(q, "/release").correct).toBe(false);
  });

  it("association : paires erronées signalées", () => {
    const q: QuestionData = {
      type: "match",
      left: [{ id: "a", text: "" }, { id: "b", text: "" }],
      right: [{ id: "x", text: "" }, { id: "y", text: "" }],
      answer: { a: "x", b: "y" },
    };
    const r = gradeQuestion(q, { a: "x", b: "x" });
    expect(r.fraction).toBe(0.5);
    expect(r.detail).toMatchObject({ wrongPairs: ["b"] });
  });

  it("rejette une réponse au mauvais format", () => {
    expect(() => gradeQuestion(single, ["b"])).toThrow(InvalidResponseError);
    expect(() => gradeQuestion(multiple, "ip")).toThrow(InvalidResponseError);
  });

  it("la forme publique ne contient jamais la réponse", () => {
    for (const q of [single, multiple]) expect(JSON.stringify(publicQuestion(q, "seed"))).not.toContain("answer");
    const order: QuestionData = { type: "order", items: ["1", "2", "3", "4"].map((id) => ({ id, text: id })), answer: ["1", "2", "3", "4"] };
    const pub = publicQuestion(order, "seed");
    expect(pub.type === "order" && pub.items.map((i) => i.id).join("")).not.toBe("1234");
  });

  it("mélange déterministe", () => {
    expect(seededShuffle([1, 2, 3, 4, 5], "x")).toEqual(seededShuffle([1, 2, 3, 4, 5], "x"));
  });
});

describe("grille de notation des textes", () => {
  const rubric = {
    criteria: [
      { id: "apipa", label: "APIPA", points: 3, patterns: ["apipa", "169.254"], required: true },
      { id: "prise", label: "Prise", points: 2, patterns: ["prise", "brassage"] },
      { id: "esc", label: "Escalade", points: 1, patterns: ["escalad*", "n2"] },
    ],
    redFlags: [{ id: "fixe", label: "IP fixe", patterns: ["ip fixe"], penalty: 2 }],
    passPercent: 60,
  };

  it("normalise accents et casse", () => {
    expect(normalize("Réseau ÉTENDU")).toBe("reseau etendu");
    expect(containsPhrase(normalize("J'escalade au N2"), "escalad*")).toBe(true);
    expect(containsPhrase(normalize("dns"), "dn")).toBe(false);
  });

  it("donne le crédit des notions présentes et signale les manques", () => {
    const r = gradeText("Le poste est en APIPA (169.254), je soupçonne la prise murale et j'escalade au N2 réseau avec les tests.", rubric, 5);
    expect(r.percent).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("une notion obligatoire manquante fait échouer", () => {
    const r = gradeText("Je pense que la prise est mal brassée et j'escalade au N2 avec mes tests réalisés.", rubric, 5);
    expect(r.passed).toBe(false);
    expect(r.missing.find((m) => m.id === "apipa")?.required).toBe(true);
  });

  it("les formulations à risque retirent des points", () => {
    const r = gradeText("APIPA donc je mets une IP fixe, problème de prise, escalade au N2 ensuite.", rubric, 5);
    expect(r.redFlags).toHaveLength(1);
    expect(r.score).toBe(4);
  });

  it("une réponse trop courte est plafonnée", () => {
    const r = gradeText("APIPA prise N2", rubric, 15);
    expect(r.tooShort).toBe(true);
    expect(r.passed).toBe(false);
  });
});

describe("formulations à risque niées", () => {
  it("« ne pas mettre d'IP fixe » ne déclenche pas la pénalité", async () => {
    const { gradeText } = await import("@/server/engines/rubric");
    const rubric = { criteria: [{ id: "a", label: "a", points: 1, patterns: ["prise"] }], redFlags: [{ id: "f", label: "IP fixe", patterns: ["ip fixe"], penalty: 1 }], passPercent: 50 };
    expect(gradeText("Surtout ne pas mettre une ip fixe, je teste la prise.", rubric).redFlags).toHaveLength(0);
    expect(gradeText("Je mets une ip fixe puis je teste la prise.", rubric).redFlags).toHaveLength(1);
  });
});
