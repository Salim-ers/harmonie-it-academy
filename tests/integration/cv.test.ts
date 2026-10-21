/** Relecture de CV : jamais enregistrée, offre d'un autre utilisateur inaccessible. */
import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { createUser, prepareDatabase } from "./helpers";
import { analyzeOffer } from "@/server/services/career";
import { reviewMyCv } from "@/server/services/cv";
import { ForbiddenError } from "@/server/authz/policies";

const CV = `Alex Bernard — alex.bernard@exemple.fr — 06 11 22 33 44 — Nantes
Expérience : 4 ans en boutique, traité 40 demandes par jour, formé 5 vendeurs, rédigé les procédures de caisse.
Formation : BTS commerce. Compétences : Windows 11, Active Directory, GLPI. Langues : anglais courant.
Projets : dépannage du parc informatique familial, installation et configuration d'un réseau domestique.`.repeat(2);

describe("relecture de CV", () => {
  beforeAll(() => prepareDatabase());

  it("analyse sans rien écrire en base et sans fuite d'une offre étrangère", async () => {
    const a = await createUser();
    const b = await createUser();
    const offerB = await analyzeOffer(b, { title: "Offre B", offerText: "Technicien support N1 GLPI Active Directory Windows 11 DHCP DNS. ".repeat(6), interviewDate: null });
    const marker = "MARQUEUR-CV-7f3a";
    const before = await getDb().execute(sql`select count(*)::int as n from job_analyses`);

    const r = await reviewMyCv(a, { cvText: `${CV}\n${marker}`, offerId: null });
    expect(r.checks.length).toBeGreaterThan(3);
    expect(r.defend.map((l) => l.id)).toContain("ad");

    await expect(reviewMyCv(a, { cvText: CV, offerId: offerB })).rejects.toBeInstanceOf(ForbiddenError);
    const withOwn = await reviewMyCv(b, { cvText: CV, offerId: offerB });
    expect(withOwn.offerCoverage?.total).toBeGreaterThan(0);

    const after = await getDb().execute(sql`select count(*)::int as n from job_analyses`);
    expect(after).toEqual(before);
    // Le texte du CV n'apparaît dans aucune colonne texte ou JSON de la base.
    const cols = (await getDb().execute(sql`
      select table_name, column_name from information_schema.columns
      where table_schema = 'public' and data_type in ('text', 'jsonb', 'character varying')
    `)) as unknown as { table_name: string; column_name: string }[];
    expect(cols.length).toBeGreaterThan(50);
    for (const c of cols) {
      const rows = (await getDb().execute(
        sql.raw(`select count(*)::int as n from "${c.table_name}" where "${c.column_name}"::text like '%${marker}%'`),
      )) as unknown as { n: number }[];
      expect(rows[0].n, `${c.table_name}.${c.column_name}`).toBe(0);
    }
  });
});
