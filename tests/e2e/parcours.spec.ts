import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

/**
 * Parcours candidat complet, tel qu'un vrai utilisateur le vit.
 * Le lien de vérification est lu dans la boîte d'envoi de développement (`dev_outbox`),
 * jamais dans un vrai e-mail : la base doit être locale.
 */
const DB = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

function verificationLink(email: string): string {
  if (!/localhost|127\.0\.0\.1/.test(DB)) throw new Error("E2E : base locale uniquement (E2E_DATABASE_URL).");
  const out = execFileSync("psql", [DB, "-At", "-c", `select text from dev_outbox where "to" = '${email.replace(/'/g, "")}' order by created_at desc limit 1`]).toString();
  const link = out.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error("Lien de vérification introuvable dans dev_outbox.");
  return link;
}

async function noConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

test("le site public se charge et l'incident de démonstration est jouable @mobile", async ({ page }) => {
  const errors = await noConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("informatique");
  await page.getByRole("button", { name: /Lire la configuration IP/ }).click();
  await expect(page.locator("text=169.254").first()).toBeVisible();
  for (const path of ["/formations", "/laboratoires", "/carriere", "/tarifs", "/verifier"]) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(200);
  }
  expect(errors).toEqual([]);
});

test("inscription, leçon, laboratoire, analyse d'offre et relecture de CV", async ({ page }) => {
  const errors = await noConsoleErrors(page);
  const email = `e2e.${Date.now()}@exemple.fr`;

  await page.goto("/inscription");
  await page.fill("#name", "Camille Martin");
  await page.fill("#email", email);
  await page.fill("#password", "Mot-de-passe-solide-2026");
  await page.check('input[name="terms"]');
  await page.getByRole("button", { name: /Créer mon compte|Créer un compte|S'inscrire/ }).click();
  await expect(page.getByText(email)).toBeVisible();

  await page.goto(verificationLink(email));
  await page.goto("/campus");
  await expect(page.getByRole("heading", { name: /Bonjour Camille/ })).toBeVisible();

  // Une leçon gratuite s'ouvre et son quiz est présent.
  await page.goto("/campus/cours/n1-dhcp");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("DHCP");

  // Laboratoire gratuit : on prend le ticket et on agit.
  await page.goto("/campus/laboratoires/zebra-quai-3");
  await page.getByRole("button", { name: /Prendre le ticket/ }).click();
  await page.getByRole("button", { name: /Observer l'écran et les voyants/ }).click();
  await expect(page.getByText(/Journal d'intervention/)).toBeVisible();

  // Analyse d'offre.
  await page.goto("/campus/carriere");
  await page.fill("#title", "Technicien support N1, Lyon");
  await page.fill(
    "#offerText",
    "Technicien support N1 H/F. Missions : tickets GLPI, comptes Active Directory, Microsoft 365, diagnostic réseau TCP/IP, DHCP et DNS, postes Windows 11. PowerShell indispensable. Anglais technique. Sens du service.",
  );
  await page.getByRole("button", { name: "Analyser l'offre" }).click();
  await page.waitForURL(/\/campus\/carriere\/offres\//);
  await expect(page.getByRole("heading", { name: "Plan de préparation" })).toBeVisible();

  // Relecture de CV comparée à cette offre.
  await page.getByRole("link", { name: "Comparer mon CV à cette offre" }).click();
  await page.fill(
    "#cvText",
    `Camille Martin — camille@exemple.fr — 06 12 34 56 78 — Lyon
Expérience : conseillère clientèle, traité 60 appels par jour, rédigé 30 fiches de procédure.
Formation : BTS. Compétences : Windows 11, Active Directory, GLPI. Langues : anglais B1.`,
  );
  await page.getByRole("button", { name: "Relire mon CV" }).click();
  await expect(page.getByRole("heading", { name: "Forme et lisibilité" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Face à l'offre choisie" })).toBeVisible();

  expect(errors).toEqual([]);
});
