import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";

export type SearchHit = { kind: "lesson" | "glossary" | "scenario"; slug: string; title: string; excerpt: string; snippet: string; locked: boolean };

/**
 * Recherche plein texte (PostgreSQL, configuration « french », sans accents).
 * Les contenus réservés apparaissent avec un cadenas : on montre qu'ils existent, sans leur texte.
 */
export async function searchContent(query: string, tier: number, limit = 12): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const rows = await getDb().execute<{ kind: SearchHit["kind"]; ref_slug: string; title: string; excerpt: string; snippet: string; required_tier: number }>(sql`
    with query as (select websearch_to_tsquery('french', hia_unaccent(${q})) as tsq)
    select kind, ref_slug, title, excerpt, required_tier,
      ts_headline('french', body, (select tsq from query), 'StartSel=«, StopSel=», MaxWords=24, MinWords=10, MaxFragments=1') as snippet
    from search_documents, query
    where tsv @@ query.tsq or hia_unaccent(lower(title)) like '%' || hia_unaccent(lower(${q})) || '%'
    order by ts_rank(tsv, query.tsq) desc
    limit ${limit}
  `);
  return rows.map((r) => {
    const locked = Number(r.required_tier) > tier;
    return { kind: r.kind, slug: r.ref_slug, title: r.title, excerpt: r.excerpt, snippet: locked ? "" : r.snippet, locked };
  });
}
