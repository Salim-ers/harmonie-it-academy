import { describe, expect, it } from "vitest";
import { reviewCv } from "@/server/engines/cv-review";
import { analyzeJobOffer } from "@/server/engines/job-offer";

const GOOD_CV = `Camille Martin
camille.martin@exemple.fr — 06 12 34 56 78 — Lyon, mobile sur la métropole

Profil
Technicienne support en reconversion après six ans d'accueil téléphonique.

Expérience professionnelle
Conseillère clientèle, Centre d'appels Exemple (2019-2025)
- Traité 60 appels par jour avec un suivi écrit de chaque demande
- Accompagné 12 nouveaux collaborateurs à la prise de poste
- Rédigé 30 fiches de procédure pour la base de connaissances interne

Projets
- Résolu et documenté des incidents simulés : impression, DHCP, comptes Active Directory

Formation
Parcours Technicien support N1, Harmonie IT Academy (2026)

Compétences
Windows 11, Active Directory, GLPI, DHCP et DNS, communication avec les utilisateurs

Langues
Anglais : lu et parlé (B1)`;

describe("reviewCv", () => {
  it("valide un CV structuré, chiffré et sans données sensibles", () => {
    const r = reviewCv(GOOD_CV);
    const byId = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));
    expect(byId.rubriques).toBe("ok");
    expect(byId.contact).toBe("ok");
    expect(byId.chiffres).toBe("ok");
    expect(byId.verbes).toBe("ok");
    expect(byId.donnees).toBeUndefined();
    expect(byId.projets).toBeUndefined();
  });

  it("signale les informations personnelles inutiles et les qualités sans preuve", () => {
    const cv = `Jean Dupont, né le 3 mars 1990, marié, 2 enfants. Nationalité française.
Dynamique, motivé et polyvalent, je cherche un poste de technicien.
Expérience : vendeur. Formation : bac. Compétences : informatique. ${"texte ".repeat(40)}`;
    const r = reviewCv(cv);
    const donnees = r.checks.find((c) => c.id === "donnees");
    expect(donnees?.status).toBe("attention");
    expect(donnees?.detail).toMatch(/date de naissance/);
    expect(donnees?.detail).toMatch(/situation familiale/);
    expect(donnees?.detail).toMatch(/nationalité/);
    expect(r.checks.find((c) => c.id === "qualites")).toBeDefined();
    expect(r.checks.find((c) => c.id === "contact")?.status).toBe("attention");
  });

  it("ne prend pas une durée d'expérience pour un âge", () => {
    const r = reviewCv(`${GOOD_CV}\n15 ans d'expérience en relation client.`);
    expect(r.checks.find((c) => c.id === "donnees")).toBeUndefined();
  });

  it("croise CV, preuves et offre sans jamais inventer de compétence", () => {
    const offer = analyzeJobOffer(
      "Technicien support N1 : GLPI, Active Directory, PowerShell indispensable, Microsoft 365, diagnostic réseau TCP/IP. Anglais technique.".repeat(2),
    );
    const r = reviewCv(GOOD_CV, {
      offer,
      skillLevels: {
        powershell: { level: 82, confident: true },
        identity: { level: 40, confident: false },
        m365: { level: 70, confident: false },
      },
      portfolio: [{ title: "Les étiquettes du quai 3 ne sortent plus", resolved: true }, { title: "Incident non résolu", resolved: false }],
      attestations: [{ title: "Technicien support N1", code: "ABCDEFGH23" }],
      passportUrl: "https://exemple.fr/passeport/XYZ123",
      appUrl: "https://exemple.fr",
    });
    // PowerShell prouvé mais absent du CV : à ajouter.
    expect(r.addProven.map((l) => l.id)).toContain("powershell");
    // Active Directory cité mais pas prouvé : à défendre.
    expect(r.defend.map((l) => l.id)).toContain("ad");
    // Microsoft 365 demandé, ni dans le CV ni confirmé : écart.
    expect(r.offerGaps.map((l) => l.id)).toContain("m365");
    expect(r.offerGaps.map((l) => l.id)).not.toContain("powershell");
    expect(r.offerCoverage?.total).toBeGreaterThan(0);
    // La rubrique proposée ne cite que des preuves réelles.
    const section = r.suggestedSection.join("\n");
    expect(section).toMatch(/PowerShell/);
    expect(section).not.toMatch(/Microsoft 365/);
    expect(section).toMatch(/1 incident simulé résolu/);
    expect(section).toMatch(/Attestation interne/);
    expect(section).toMatch(/verifier\/ABCDEFGH23/);
  });
});

describe("analyzeJobOffer : exigences", () => {
  const imp = (text: string) => Object.fromEntries(analyzeJobOffer(text).detected.map((d) => [d.id, d.important]));
  it("n'étend pas « indispensable » aux éléments voisins d'une liste", () => {
    const r = imp("Missions : tickets GLPI, comptes Active Directory, Microsoft 365 indispensable, diagnostic réseau TCP/IP, DHCP et DNS. PowerShell souhaité.");
    expect(r.m365).toBe(true);
    expect(r.ticketing).toBe(false);
    expect(r.ad).toBe(false);
    expect(r["dhcp-dns"]).toBe(false);
    expect(r.powershell).toBe(false);
  });
  it("applique une exigence placée en tête de liste à toute la liste", () => {
    expect(imp("Maîtrise de Windows 11, Active Directory et GLPI. Notions de DNS.")).toMatchObject({ windows: true, ad: true, ticketing: true, "dhcp-dns": false });
    expect(imp("Compétences indispensables : PowerShell, Microsoft 365. Linux apprécié.")).toMatchObject({ powershell: true, m365: true, linux: false });
  });
});
