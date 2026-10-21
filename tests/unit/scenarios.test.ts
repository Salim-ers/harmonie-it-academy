/**
 * Chaque scénario du dépôt doit être jouable de bout en bout :
 * le parcours « expert » (tests décisifs → bon diagnostic → bonne résolution → validation → note exemplaire)
 * obtient au moins 85/100, et un parcours bâclé reste nettement en dessous.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { scenarioDefinitionSchema } from "@/content/scenario-schema";
import { applyAction, applyResolution, closeTicket, initialState, isActionAvailable, submitDiagnosis, publicView } from "@/server/engines/scenario-engine";

const dir = join(process.cwd(), "src/content/scenarios");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

describe.each(files)("scénario %s", (file) => {
  const def = scenarioDefinitionSchema.parse(JSON.parse(readFileSync(join(dir, file), "utf8")));

  it("parcours expert : résolu avec un score ≥ 85", () => {
    let s = initialState(def);
    // Actions décisives et utiles disponibles, dans l'ordre du fichier, jusqu'à stabilisation.
    for (let pass = 0; pass < 3; pass++) {
      for (const a of def.actions) {
        if ((a.relevance === "key" || a.relevance === "useful") && !a.risk && isActionAvailable(a, s) && !s.performed.includes(a.id) && a.id !== def.verificationActionId) {
          s = applyAction(def, s, a.id).state;
        }
      }
    }
    const good = def.diagnoses.find((d) => d.correct)!;
    const diag = submitDiagnosis(def, s, good.id);
    expect(diag.correct, `diagnostic non justifié : indices manquants ${JSON.stringify(good.requiresClues)} / obtenus ${JSON.stringify(s.clues)}`).toBe(true);
    s = diag.state;
    const fix = def.resolutions.find((r) => r.correct && r.setFlags?.includes(def.fixedFlag))!;
    s = applyResolution(def, s, fix.id).state;
    const verif = def.actions.find((a) => a.id === def.verificationActionId)!;
    expect(isActionAvailable(verif, s)).toBe(true);
    s = applyAction(def, s, verif.id).state;
    expect(s.verifiedAfterFix).toBe(true);
    const { report } = closeTicket(def, s, def.debrief.exampleClosingNote);
    expect(report.resolved).toBe(true);
    expect(report.noteGrade.percent, "la note de clôture exemplaire doit satisfaire sa propre grille").toBeGreaterThanOrEqual(80);
    expect(report.score).toBeGreaterThanOrEqual(85);
  });

  it("parcours bâclé : fermeture sans diagnostic ni correction ≤ 30", () => {
    let s = initialState(def);
    const irrelevant = def.actions.find((a) => a.relevance === "irrelevant" && !a.risk && isActionAvailable(a, s));
    if (irrelevant) s = applyAction(def, s, irrelevant.id).state;
    const { report } = closeTicket(def, s, "Fermé.");
    expect(report.resolved).toBe(false);
    expect(report.score).toBeLessThanOrEqual(30);
  });

  it("la vue publique ne divulgue ni la cause ni les bonnes réponses", () => {
    const view = JSON.stringify(publicView(def, initialState(def)));
    expect(view).not.toContain(def.debrief.cause.slice(0, 40));
    expect(view).not.toContain('"correct"');
    expect(view).not.toContain(def.fixedFlag === "fixed" ? '"fixed":true' : def.fixedFlag);
    for (const a of def.actions) for (const o of a.outcomes) expect(view).not.toContain(o.text.slice(0, 50));
  });

  it("au moins une action à risque et une action hors sujet pour apprendre à les éviter", () => {
    expect(def.actions.some((a) => a.risk)).toBe(true);
    expect(def.actions.some((a) => a.relevance === "irrelevant")).toBe(true);
  });
});
