/**
 * Tests d'intégration sur une vraie base PostgreSQL (schéma recréé, contenu importé).
 * Couvrent les parcours critiques : notation, progression, droits d'accès, isolation des données,
 * laboratoires, examens et attestations, abonnements Stripe, workflow éditorial, B2B, recherche.
 */
import { beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { actorOf, createUser, prepareDatabase } from "./helpers";
import { getAttemptView, getPublicQuiz, saveAnswer, startAttempt, submitAttempt, submitInlineQuiz } from "@/server/services/assessments";
import { completeLesson, revealExercise, submitExerciseAnswer, touchLesson } from "@/server/services/progress";
import { closeLab, getLabView, labStep, startLab } from "@/server/services/labs";
import { analyzeOffer, answerInterviewQuestion, finishInterview, getInterviewView, getJobAnalysis, getPublicPassport, getOrCreatePassport, startInterview, updatePassport, verifyAttestation } from "@/server/services/career";
import { getUserTier } from "@/server/services/entitlements";
import { handleStripeEvent, syncSubscription, verifyWebhook } from "@/server/services/billing";
import { createDraft, getOrganizationDashboard, addOrganizationMember, createOrganization, reviewStep, saveDraft, listUsers } from "@/server/services/studio";
import { searchContent } from "@/server/services/search";
import { consumeRateLimit, RateLimitError } from "@/server/services/rate-limit";
import { getSkillMap } from "@/server/services/skills";
import { ForbiddenError } from "@/server/authz/policies";
import type { QuestionData, LessonDoc } from "@/content/schema";
import type { ScenarioDefinition } from "@/content/scenario-schema";

function correctResponse(d: QuestionData): unknown {
  switch (d.type) {
    case "single":
      return d.answer;
    case "multiple":
      return d.answer;
    case "truefalse":
      return { value: d.answer, justification: d.justification ? d.justification.criteria.map((c) => c.patterns[0]).join(", ") : undefined };
    case "order":
      return d.answer;
    case "fill":
      return d.accepted[0];
    case "match":
      return d.answer;
    case "text_rubric":
      return d.rubric.criteria.map((c) => c.patterns[0]).join(". ") + ". " + "mot ".repeat(Math.max(0, d.minWords));
  }
}

async function correctAnswersFor(slug: string) {
  const db = getDb();
  const [a] = await db.select().from(s.assessments).where(eq(s.assessments.slug, slug));
  const rows = await db
    .select({ id: s.questionVersions.id, data: s.questionVersions.data })
    .from(s.assessmentQuestions)
    .innerJoin(s.questionVersions, eq(s.questionVersions.id, s.assessmentQuestions.questionVersionId))
    .where(eq(s.assessmentQuestions.assessmentId, a.id));
  return Object.fromEntries(rows.map((r) => [r.id, correctResponse(r.data)]));
}

beforeAll(() => prepareDatabase(), 180_000);

describe("quiz et progression", () => {
  it("la version publique d'un quiz ne contient aucune réponse", async () => {
    const q = await getPublicQuiz("quiz-n1-dhcp");
    const json = JSON.stringify(q);
    expect(q.questions.length).toBeGreaterThanOrEqual(3);
    expect(json).not.toContain('"answer"');
    expect(json).not.toContain('"accepted"');
    expect(json).not.toContain("explanation");
  });

  it("un quiz juste donne 100 %, alimente les compétences, et conditionne la validation de la leçon", async () => {
    const u = await createUser();
    await touchLesson(u, "n1-dhcp", "intro", 120);
    await expect(completeLesson(u, "n1-dhcp")).rejects.toThrow(/quiz/);
    const view = await submitInlineQuiz(u, "quiz-n1-dhcp", await correctAnswersFor("quiz-n1-dhcp"));
    expect(view.percent).toBe(100);
    expect(view.passed).toBe(true);
    expect(view.questions.every((q) => q.result?.correct)).toBe(true);
    const r = await completeLesson(u, "n1-dhcp");
    expect(r.courseCompleted).toBe(false);
    const map = await getSkillMap(u);
    expect(map.skills.find((k) => k.code === "network-services")?.level).toBe(100);
    const [p] = await getDb().select().from(s.lessonProgress).where(eq(s.lessonProgress.userId, u));
    expect(p.status).toBe("completed");
    expect(p.timeSpentSec).toBe(120);
  });

  it("un quiz sans bonne réponse est noté sous le seuil ; une réponse mal formée est refusée", async () => {
    const u = await createUser();
    const view = await submitInlineQuiz(u, "quiz-n1-dhcp", {});
    expect(view.passed).toBe(false);
    expect(view.percent).toBe(0);
    const answers = await correctAnswersFor("quiz-n1-dhcp");
    const [first] = Object.keys(answers);
    await expect(submitInlineQuiz(u, "quiz-n1-dhcp", { [first]: { malforme: true } })).rejects.toThrow(/format/);
  });

  it("une leçon payante est refusée en offre gratuite, puis accessible avec Academy", async () => {
    const u = await createUser();
    await expect(touchLesson(u, "n1-dns", null, 10)).rejects.toBeInstanceOf(ForbiddenError);
    await getDb().insert(s.entitlements).values({ userId: u, source: "manual", sourceRef: "t", tier: 1, active: true });
    await expect(touchLesson(u, "n1-dns", null, 10)).resolves.toBeUndefined();
  });

  it("les indices d'exercice se consultent dans l'ordre et pénalisent le score", async () => {
    const u = await createUser();
    await expect(revealExercise(u, "n1-dhcp", "exercise", 2)).rejects.toThrow(/ordre/);
    const h1 = await revealExercise(u, "n1-dhcp", "exercise", 1);
    expect(h1.hints).toHaveLength(1);
    expect(h1.solution).toBeNull();
    const res = await submitExerciseAnswer(
      u,
      "n1-dhcp",
      "exercise",
      "Le poste est en APIPA 169.254 : aucune réponse DHCP alors que le média est connecté. Le voisin fonctionne, donc je soupçonne la prise ou le brassage sur un mauvais VLAN. Je teste une autre prise puis j'escalade au N2 réseau.",
    );
    expect(res.result.percent).toBe(100);
    expect(res.score).toBe(90);
  });
});

describe("isolation des données (IDOR)", () => {
  it("un apprenant ne peut lire ni compléter la tentative d'un autre", async () => {
    const a = await createUser();
    const b = await createUser();
    const attemptId = await startAttempt(a, "ex-lire-ipconfig");
    await expect(getAttemptView(b, attemptId)).rejects.toBeInstanceOf(ForbiddenError);
    const view = await getAttemptView(a, attemptId);
    await expect(saveAnswer(b, attemptId, view.questions[0].id, "x")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(submitAttempt(b, attemptId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("un laboratoire, une analyse d'offre et un entretien restent privés", async () => {
    const a = await createUser({ tier: 2 });
    const b = await createUser({ tier: 2 });
    const lab = await startLab(a, "zebra-quai-3");
    await expect(getLabView(b, lab)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(labStep(b, lab, { kind: "hint" })).rejects.toBeInstanceOf(ForbiddenError);
    const offer = await analyzeOffer(a, { title: "Test", offerText: "Technicien support N1 GLPI Active Directory Windows 11 DHCP DNS. ".repeat(6), interviewDate: null });
    await expect(getJobAnalysis(b, offer)).rejects.toBeInstanceOf(ForbiddenError);
    const itw = await startInterview(a, { role: "support_n1", level: "debutant", sector: "general", kind: "technique", lang: "fr", durationMin: 15 });
    await expect(getInterviewView(b, itw)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("laboratoire : incident simulé de bout en bout", () => {
  it("action dangereuse confirmée, diagnostic étayé, résolution, validation et débrief", async () => {
    const u = await createUser();
    const id = await startLab(u, "zebra-quai-3");
    expect(await startLab(u, "zebra-quai-3")).toBe(id);
    const danger = await labStep(u, id, { kind: "action", actionId: "redemarrer-serveur" });
    expect(danger.needsConfirmation).toBe(true);
    // Diagnostic juste mais non étayé : refusé.
    await labStep(u, id, { kind: "diagnosis", diagnosisId: "d-adresse" });
    let view = await getLabView(u, id);
    expect(view.view.state.diagnosisFound).toBe(false);
    for (const a of ["interroger-operateur", "etiquette-configuration", "ping-ancienne", "file-attente"]) await labStep(u, id, { kind: "action", actionId: a });
    await labStep(u, id, { kind: "diagnosis", diagnosisId: "d-adresse" });
    await labStep(u, id, { kind: "resolution", resolutionId: "r-adresse-documentee" });
    await labStep(u, id, { kind: "action", actionId: "impression-test" });
    view = await getLabView(u, id);
    expect(view.view.state.fixed).toBe(true);
    expect(view.report).toBeNull();
    const def = (await getDb().select().from(s.scenarioVersions))[0].definition as ScenarioDefinition;
    const report = await closeLab(u, id, def.debrief.exampleClosingNote);
    expect(report.resolved).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(80);
    view = await getLabView(u, id);
    expect(view.debrief?.cause).toBeTruthy();
    const badges = await getDb().select().from(s.userBadges).where(eq(s.userBadges.userId, u));
    expect(badges.map((b) => b.badgeCode)).toContain("premier-incident");
  });

  it("un laboratoire Pro est refusé en offre gratuite", async () => {
    const u = await createUser();
    await expect(startLab(u, "partage-acces-refuse")).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("examen final et attestation", () => {
  it("exige Academy Pro, masque les réponses, limite les tentatives et délivre une attestation vérifiable", async () => {
    const free = await createUser();
    await expect(startAttempt(free, "examen-final-support-n1")).rejects.toBeInstanceOf(ForbiddenError);
    const u = await createUser({ tier: 2, name: "Inès Martin" });
    const attemptId = await startAttempt(u, "examen-final-support-n1");
    const answers = await correctAnswersFor("examen-final-support-n1");
    for (const [q, v] of Object.entries(answers)) await saveAnswer(u, attemptId, q, v);
    const view = await submitAttempt(u, attemptId);
    expect(view.passed).toBe(true);
    expect(view.questions.every((q) => q.result?.hidden)).toBe(true);
    expect(JSON.stringify(view)).not.toContain('"expected":["');
    expect(view.attestationCode).toBeTruthy();
    const v = await verifyAttestation(view.attestationCode!);
    expect(v?.name).toBe("Inès Martin");
    expect(await verifyAttestation("INEXISTANT1")).toBeNull();
    await startAttempt(u, "examen-final-support-n1").then((id) => submitAttempt(u, id));
    await startAttempt(u, "examen-final-support-n1").then((id) => submitAttempt(u, id));
    await expect(startAttempt(u, "examen-final-support-n1")).rejects.toThrow(/tentatives/);
  });
});

describe("abonnements Stripe", () => {
  const stripe = new Stripe("sk_test_dummy_for_unit_tests");
  const subscription = (userId: string, status: Stripe.Subscription.Status, priceId: string) =>
    ({
      id: `sub_${userId.slice(0, 8)}`,
      object: "subscription",
      customer: `cus_${userId.slice(0, 8)}`,
      status,
      cancel_at_period_end: false,
      metadata: { userId, planCode: "pro" },
      items: { object: "list", data: [{ id: "si_1", price: { id: priceId }, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
    }) as unknown as Stripe.Subscription;

  it("le droit d'accès suit l'état réel de l'abonnement, de façon idempotente", async () => {
    const db = getDb();
    await db.update(s.plans).set({ stripePriceId: "price_test_pro" }).where(eq(s.plans.code, "pro"));
    const u = await createUser();
    expect(await getUserTier(u)).toBe(0);
    const ev = (type: string, sub: Stripe.Subscription, id: string) => ({ id, type, data: { object: sub } }) as unknown as Stripe.Event;
    await handleStripeEvent(ev("customer.subscription.created", subscription(u, "active", "price_test_pro"), `evt_a_${u}`));
    expect(await getUserTier(u)).toBe(2);
    const dup = await handleStripeEvent(ev("customer.subscription.created", subscription(u, "active", "price_test_pro"), `evt_a_${u}`));
    expect(dup.duplicate).toBe(true);
    await handleStripeEvent(ev("customer.subscription.updated", subscription(u, "past_due", "price_test_pro"), `evt_b_${u}`));
    expect(await getUserTier(u)).toBe(2);
    await handleStripeEvent(ev("customer.subscription.deleted", subscription(u, "canceled", "price_test_pro"), `evt_c_${u}`));
    expect(await getUserTier(u)).toBe(0);
  });

  it("le webhook refuse une signature invalide et accepte une signature valide", () => {
    const payload = JSON.stringify({ id: "evt_sig", object: "event", type: "invoice.finalized", data: { object: {} } });
    expect(() => verifyWebhook(payload, "t=1,v1=faux")).toThrow();
    expect(() => verifyWebhook(payload, null)).toThrow();
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    expect(verifyWebhook(payload, header).id).toBe("evt_sig");
  });

  it("un abonnement d'un client inconnu est rejeté (et non attribué au hasard)", async () => {
    await expect(syncSubscription(getDb(), { ...subscription("inconnu-xyz", "active", "price_test_pro"), metadata: {} } as Stripe.Subscription)).rejects.toThrow(/introuvable/);
  });
});

describe("Studio : workflow éditorial et périmètres", () => {
  it("brouillon, révision technique par un autre formateur, validation pédagogique et publication", async () => {
    const db = getDb();
    const [lesson] = await db.select().from(s.lessons).where(eq(s.lessons.slug, "n1-dns"));
    const [mod] = await db.select().from(s.courseModules).where(eq(s.courseModules.id, lesson.moduleId));
    const author = await createUser({ role: "trainer" });
    const reviewer = await createUser({ role: "trainer" });
    const outsider = await createUser({ role: "trainer" });
    const lead = await createUser({ role: "pedago_lead" });
    await db.insert(s.courseStaff).values([
      { courseId: mod.courseId, userId: author, role: "trainer" },
      { courseId: mod.courseId, userId: reviewer, role: "trainer" },
    ]);
    await expect(createDraft(await actorOf(outsider), lesson.id)).rejects.toBeInstanceOf(ForbiddenError);
    const versionId = await createDraft(await actorOf(author), lesson.id);
    const [v] = await db.select().from(s.lessonVersions).where(eq(s.lessonVersions.id, versionId));
    const doc = structuredClone(v.content as LessonDoc);
    const invalid = await saveDraft(await actorOf(author), versionId, { ...doc, blocks: doc.blocks.filter((b) => b.kind !== "quiz") }, "test");
    expect(invalid.ok).toBe(false);
    doc.meta.title = "DNS : de nom à adresse (révisé)";
    expect((await saveDraft(await actorOf(author), versionId, doc, "Titre")).ok).toBe(true);
    await reviewStep(await actorOf(author), versionId, "submit", "approved", "");
    await expect(reviewStep(await actorOf(author), versionId, "technical", "approved", "")).rejects.toBeInstanceOf(ForbiddenError);
    await reviewStep(await actorOf(reviewer), versionId, "technical", "approved", "RAS");
    await expect(reviewStep(await actorOf(reviewer), versionId, "pedagogical", "approved", "")).rejects.toBeInstanceOf(ForbiddenError);
    const r = await reviewStep(await actorOf(lead), versionId, "pedagogical", "approved", "");
    expect(r.published).toBe(true);
    const [l2] = await db.select().from(s.lessons).where(eq(s.lessons.id, lesson.id));
    expect(l2.publishedVersionId).toBe(versionId);
    expect(l2.title).toContain("révisé");
  });

  it("un formateur ne voit que les apprenants de ses formations", async () => {
    const trainer = await createUser({ role: "trainer" });
    const list = await listUsers(await actorOf(trainer), "");
    expect(list).toHaveLength(0);
  });
});

describe("entreprises clientes (multi-tenant)", () => {
  it("l'administrateur d'entreprise ne voit que son organisation", async () => {
    const admin = await createUser({ role: "super_admin" });
    const orgA = await createOrganization(await actorOf(admin), { name: "Alpha", slug: `alpha-${Date.now()}`, seats: 5 });
    const orgB = await createOrganization(await actorOf(admin), { name: "Bêta", slug: `beta-${Date.now()}`, seats: 5 });
    const managerA = await createUser();
    const employee = await createUser();
    const [mA] = await getDb().select({ email: s.user.email }).from(s.user).where(eq(s.user.id, managerA));
    const [emp] = await getDb().select({ email: s.user.email }).from(s.user).where(eq(s.user.id, employee));
    await addOrganizationMember(await actorOf(admin), orgA, mA.email, "org_admin");
    await addOrganizationMember(await actorOf(admin), orgA, emp.email, "member");
    expect(await getUserTier(employee)).toBe(2);
    const dash = await getOrganizationDashboard(await actorOf(managerA), orgA);
    expect(dash.members).toHaveLength(2);
    await expect(getOrganizationDashboard(await actorOf(managerA), orgB)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getOrganizationDashboard(await actorOf(employee), orgA)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("carrière", () => {
  it("analyse d'offre : détecte les compétences et produit un plan daté", async () => {
    const u = await createUser();
    const text =
      "Nous recherchons un technicien support informatique niveau 1 (helpdesk). Maîtrise indispensable de Windows 10/11 et d'Active Directory. Connaissance de GLPI et des processus ITIL. Notions réseau TCP/IP, DHCP, DNS. Anglais technique apprécié. Sens du service et qualités rédactionnelles. Débutant accepté.";
    const id = await analyzeOffer(u, { title: "Support N1", offerText: text, interviewDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) });
    const a = await getJobAnalysis(u, id);
    const ids = a.result.detected.map((d) => d.id);
    for (const k of ["windows", "ad", "ticketing", "itil", "dhcp-dns", "anglais", "relationnel", "support-n1"]) expect(ids).toContain(k);
    expect(a.result.detected.find((d) => d.id === "windows")?.important).toBe(true);
    expect(a.result.junior).toBe(true);
    expect(a.result.plan.length).toBeGreaterThanOrEqual(3);
    expect(a.result.plan.at(-1)?.focus).toBe("Répétition générale");
  });

  it("simulation d'entretien : quota gratuit, notation par grille, preuves de compétences", async () => {
    const u = await createUser();
    const id = await startInterview(u, { role: "support_n1", level: "debutant", sector: "general", kind: "technique", lang: "fr", durationMin: 15 });
    await expect(startInterview(u, { role: "support_n1", level: "debutant", sector: "general", kind: "technique", lang: "fr", durationMin: 15 })).rejects.toThrow(/gratuite/);
    const view = await getInterviewView(u, id);
    const [q] = await getDb().select().from(s.interviewQuestions).where(eq(s.interviewQuestions.id, view.questions[0].id));
    const good = await answerInterviewQuestion(u, id, q.id, q.modelAnswer);
    expect(good.score).toBeGreaterThanOrEqual(80);
    const score = await finishInterview(u, id);
    expect(score).toBeGreaterThan(0);
  });

  it("le passeport public est désactivé par défaut et n'expose jamais l'e-mail", async () => {
    const u = await createUser({ name: "Karim Test" });
    const p = await getOrCreatePassport(u);
    expect(await getPublicPassport(p.publicCode)).toBeNull();
    await updatePassport(u, { enabled: true, displayName: "Karim T.", headline: "Support N1", showPortfolio: true });
    const pub = await getPublicPassport(p.publicCode);
    expect(pub?.displayName).toBe("Karim T.");
    expect(JSON.stringify(pub)).not.toContain("@test.local");
    const consents = await getDb().select().from(s.consentRecords).where(and(eq(s.consentRecords.userId, u), eq(s.consentRecords.kind, "public_passport")));
    expect(consents).toHaveLength(1);
  });
});

describe("recherche et limites", () => {
  it("recherche plein texte insensible aux accents, contenus réservés verrouillés", async () => {
    const hits = await searchContent("reseau dhcp", 0);
    expect(hits.length).toBeGreaterThan(0);
    const dns = (await searchContent("résolution de noms", 0)).find((h) => h.slug === "n1-dns");
    expect(dns?.locked).toBe(true);
    expect(dns?.snippet).toBe("");
    expect((await searchContent("dhcp", 0)).find((h) => h.slug === "n1-dhcp")?.locked).toBe(false);
  });

  it("limitation de débit applicative", async () => {
    const key = `test:${Date.now()}`;
    await consumeRateLimit(key, 2, 60);
    await consumeRateLimit(key, 2, 60);
    await expect(consumeRateLimit(key, 2, 60)).rejects.toBeInstanceOf(RateLimitError);
  });
});
