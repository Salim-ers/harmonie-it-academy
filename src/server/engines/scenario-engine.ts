/**
 * Moteur de simulation d'incidents — fonctions pures, sans I/O.
 * L'état est sérialisable (JSONB) et rejoué à l'identique : même définition + mêmes actions = même résultat.
 */
import type { ScenarioAction, ScenarioDefinition } from "@/content/scenario-schema";
import { gradeText, type RubricResult } from "./rubric";

export type LabState = {
  flags: string[];
  clues: string[];
  performed: string[];
  minutes: number;
  hintsUsed: number;
  dangerous: string[];
  diagnosisAttempts: string[];
  diagnosisFound: boolean;
  resolutionAttempts: string[];
  fixedAtStep: number | null;
  verifiedAfterFix: boolean;
  closed: boolean;
};

export type ActionResult = {
  actionId: string;
  label: string;
  text: string;
  terminal?: { shell: string; lines: string[] };
  newClues: { id: string; label: string }[];
  risk?: { level: "caution" | "dangerous"; explanation: string };
  minutes: number;
};

export type LabReport = {
  score: number;
  breakdown: { key: string; label: string; points: number; max: number; detail: string }[];
  closingNote: string;
  noteGrade: RubricResult;
  resolved: boolean;
  minutes: number;
  slaMinutes: number;
  keyActionsDone: string[];
  keyActionsMissed: string[];
  irrelevantActions: string[];
  dangerousActions: { label: string; explanation: string }[];
  timeline: { step: number; label: string; category: string }[];
  skillScores: Record<string, number>;
};

export class ScenarioError extends Error {}

export function initialState(def: ScenarioDefinition): LabState {
  return {
    flags: [...def.startFlags],
    clues: [],
    performed: [],
    minutes: 0,
    hintsUsed: 0,
    dangerous: [],
    diagnosisAttempts: [],
    diagnosisFound: false,
    resolutionAttempts: [],
    fixedAtStep: null,
    verifiedAfterFix: false,
    closed: false,
  };
}

const matches = (flags: string[], cond?: { all?: string[]; none?: string[] }) =>
  !cond || ((cond.all ?? []).every((f) => flags.includes(f)) && (cond.none ?? []).every((f) => !flags.includes(f)));

export function isActionAvailable(action: ScenarioAction, state: LabState) {
  return matches(state.flags, action.availableWhen);
}

/** Vue publique : ce que le navigateur peut voir (aucune cause, aucun résultat, aucun drapeau « correct »). */
export function publicView(def: ScenarioDefinition, state: LabState) {
  return {
    slug: def.slug,
    title: def.title,
    summary: def.summary,
    company: def.company,
    ticket: def.ticket,
    estimatedMinutes: def.estimatedMinutes,
    actions: def.actions
      .filter((a) => isActionAvailable(a, state))
      .map((a) => ({
        id: a.id,
        label: a.label,
        category: a.category,
        minutes: a.minutes,
        done: state.performed.includes(a.id),
        warn: a.risk ? a.risk.level : null,
      })),
    clues: def.clues.filter((c) => state.clues.includes(c.id)),
    diagnoses: def.diagnoses.map((d) => ({ id: d.id, label: d.label })),
    resolutions: def.resolutions.map((r) => ({ id: r.id, label: r.label })),
    state: {
      minutes: state.minutes,
      hintsUsed: state.hintsUsed,
      diagnosisFound: state.diagnosisFound,
      fixed: state.fixedAtStep !== null,
      closed: state.closed,
      performedCount: state.performed.length,
    },
  };
}
export type LabPublicView = ReturnType<typeof publicView>;

export function applyAction(def: ScenarioDefinition, prev: LabState, actionId: string): { state: LabState; result: ActionResult } {
  if (prev.closed) throw new ScenarioError("Le ticket est clôturé.");
  const action = def.actions.find((a) => a.id === actionId);
  if (!action) throw new ScenarioError("Action inconnue.");
  if (!isActionAvailable(action, prev)) throw new ScenarioError("Cette action n'est pas disponible pour l'instant.");

  const outcome = action.outcomes.find((o) => matches(prev.flags, o.when)) ?? action.outcomes[action.outcomes.length - 1];
  const flags = new Set(prev.flags);
  for (const f of outcome.setFlags ?? []) flags.add(f);
  for (const f of outcome.clearFlags ?? []) flags.delete(f);
  const newClueIds = (outcome.reveals ?? []).filter((c) => !prev.clues.includes(c));

  const state: LabState = {
    ...prev,
    flags: [...flags],
    clues: [...prev.clues, ...newClueIds],
    performed: [...prev.performed, action.id],
    minutes: prev.minutes + action.minutes,
    dangerous: action.risk?.level === "dangerous" && !prev.dangerous.includes(action.id) ? [...prev.dangerous, action.id] : prev.dangerous,
    verifiedAfterFix:
      prev.verifiedAfterFix || (action.id === def.verificationActionId && prev.fixedAtStep !== null && flags.has(def.fixedFlag)),
  };
  return {
    state,
    result: {
      actionId: action.id,
      label: action.label,
      text: outcome.text,
      terminal: outcome.terminal,
      newClues: def.clues.filter((c) => newClueIds.includes(c.id)),
      risk: action.risk,
      minutes: action.minutes,
    },
  };
}

export function submitDiagnosis(def: ScenarioDefinition, prev: LabState, diagnosisId: string) {
  if (prev.closed) throw new ScenarioError("Le ticket est clôturé.");
  if (prev.diagnosisFound) throw new ScenarioError("Le diagnostic est déjà validé.");
  const d = def.diagnoses.find((x) => x.id === diagnosisId);
  if (!d) throw new ScenarioError("Diagnostic inconnu.");
  const missingClues = (d.requiresClues ?? []).filter((c) => !prev.clues.includes(c));
  // Un diagnostic juste mais non étayé par les tests est refusé : on évalue le raisonnement, pas la chance.
  const justified = d.correct && missingClues.length === 0;
  const state: LabState = {
    ...prev,
    diagnosisAttempts: [...prev.diagnosisAttempts, d.id],
    diagnosisFound: justified,
    minutes: prev.minutes + 2,
  };
  return {
    state,
    correct: justified,
    feedback: d.correct && !justified
      ? "Votre hypothèse est plausible, mais rien dans vos vérifications ne la prouve encore. Réalisez le test qui permettrait de la confirmer avant de conclure."
      : d.feedback,
  };
}

export function applyResolution(def: ScenarioDefinition, prev: LabState, resolutionId: string) {
  if (prev.closed) throw new ScenarioError("Le ticket est clôturé.");
  const r = def.resolutions.find((x) => x.id === resolutionId);
  if (!r) throw new ScenarioError("Résolution inconnue.");
  if (r.requires && !r.requires.all.every((f) => prev.flags.includes(f))) {
    // La procédure n'est pas respectée : refus explicite, compté comme une tentative.
    return { state: { ...prev, resolutionAttempts: [...prev.resolutionAttempts, r.id], minutes: prev.minutes + 1 }, correct: false, feedback: r.requires.message };
  }
  const flags = new Set(prev.flags);
  for (const f of r.setFlags ?? []) flags.add(f);
  const fixedNow = flags.has(def.fixedFlag);
  const state: LabState = {
    ...prev,
    flags: [...flags],
    resolutionAttempts: [...prev.resolutionAttempts, r.id],
    fixedAtStep: prev.fixedAtStep ?? (fixedNow ? prev.performed.length : null),
    minutes: prev.minutes + 5,
  };
  return { state, correct: r.correct, feedback: r.feedback };
}

export function useHint(def: ScenarioDefinition, prev: LabState) {
  if (prev.hintsUsed >= def.hints.length) throw new ScenarioError("Tous les indices ont été consultés.");
  const level = prev.hintsUsed;
  return { state: { ...prev, hintsUsed: prev.hintsUsed + 1 }, hint: def.hints[level], level: level + 1 };
}

const ATTEMPT_POINTS = (attempts: number, max: number) => (attempts === 1 ? max : attempts === 2 ? Math.round(max * 0.6) : attempts === 3 ? Math.round(max * 0.3) : 0);

/** Clôture le ticket et calcule le compte rendu, selon un barème explicite affiché à l'apprenant. */
export function closeTicket(def: ScenarioDefinition, prev: LabState, closingNote: string): { state: LabState; report: LabReport } {
  if (prev.closed) throw new ScenarioError("Le ticket est déjà clôturé.");
  const resolved = prev.flags.includes(def.fixedFlag);
  const keyActions = def.actions.filter((a) => a.relevance === "key");
  const keyDone = keyActions.filter((a) => prev.performed.includes(a.id));
  const irrelevant = def.actions.filter((a) => a.relevance === "irrelevant" && prev.performed.includes(a.id));
  const noteGrade = gradeText(closingNote, def.closureRubric, 15);

  const correctDiagIndex = prev.diagnosisFound ? prev.diagnosisAttempts.length : 0;
  const diag = prev.diagnosisFound ? ATTEMPT_POINTS(correctDiagIndex, 30) : 0;
  const correctResIndex = prev.resolutionAttempts.findIndex((id) => def.resolutions.find((r) => r.id === id)?.correct);
  const res = resolved && correctResIndex >= 0 ? ATTEMPT_POINTS(correctResIndex + 1, 20) : 0;
  const method = keyActions.length ? Math.round((keyDone.length / keyActions.length) * 15 - Math.min(5, irrelevant.length)) : 15;
  const validation = prev.verifiedAfterFix ? 10 : 0;
  const safety = Math.max(0, 10 - prev.dangerous.length * 5);
  const sla = def.ticket.slaMinutes;
  const efficiency = prev.minutes <= sla ? 5 : prev.minutes <= sla * 1.5 ? 2 : 0;
  const documentation = Math.round((noteGrade.percent / 100) * 10);
  const hintPenalty = prev.hintsUsed * 3;

  const breakdown: LabReport["breakdown"] = [
    { key: "diagnostic", label: "Diagnostic", points: diag, max: 30, detail: prev.diagnosisFound ? `Trouvé à la tentative n° ${correctDiagIndex}` : "Cause non identifiée" },
    { key: "resolution", label: "Résolution", points: res, max: 20, detail: resolved ? "Service rétabli" : "Service non rétabli à la clôture" },
    { key: "method", label: "Méthode", points: Math.max(0, method), max: 15, detail: `${keyDone.length}/${keyActions.length} vérifications décisives, ${irrelevant.length} action(s) hors sujet` },
    { key: "validation", label: "Test de validation", points: validation, max: 10, detail: prev.verifiedAfterFix ? "Vérifié après correction" : "Aucune vérification après correction" },
    { key: "safety", label: "Sécurité", points: safety, max: 10, detail: prev.dangerous.length ? `${prev.dangerous.length} action(s) à risque` : "Aucune action à risque" },
    { key: "efficiency", label: "Respect du SLA", points: efficiency, max: 5, detail: `${prev.minutes} min simulées pour un SLA de ${sla} min` },
    { key: "documentation", label: "Note de clôture", points: documentation, max: 10, detail: `${noteGrade.percent} % des éléments attendus` },
  ];
  const raw = breakdown.reduce((s, b) => s + b.points, 0);
  const score = Math.max(0, Math.min(100, raw - hintPenalty));
  if (hintPenalty) breakdown.push({ key: "hints", label: "Indices consultés", points: -hintPenalty, max: 0, detail: `${prev.hintsUsed} indice(s), −3 points chacun` });

  const diagnosticSkill = Math.round(((diag + Math.max(0, method) + validation) / 55) * 100);
  const skillScores: Record<string, number> = { diagnostic: diagnosticSkill, documentation: noteGrade.percent };
  for (const s of def.skills) if (!(s in skillScores)) skillScores[s] = score;

  const report: LabReport = {
    score,
    breakdown,
    closingNote,
    noteGrade,
    resolved,
    minutes: prev.minutes,
    slaMinutes: sla,
    keyActionsDone: keyDone.map((a) => a.label),
    keyActionsMissed: keyActions.filter((a) => !prev.performed.includes(a.id)).map((a) => a.label),
    irrelevantActions: irrelevant.map((a) => a.label),
    dangerousActions: def.actions
      .filter((a) => prev.dangerous.includes(a.id))
      .map((a) => ({ label: a.label, explanation: a.risk?.explanation ?? "" })),
    timeline: prev.performed.map((id, i) => {
      const a = def.actions.find((x) => x.id === id)!;
      return { step: i + 1, label: a.label, category: a.category };
    }),
    skillScores,
  };
  return { state: { ...prev, closed: true }, report };
}
