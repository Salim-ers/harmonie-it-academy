import type { MetadataRoute } from "next";
import { getCatalog } from "@/server/services/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const pages = ["", "/formations", "/ecoles/support", "/ecoles/infrastructure", "/laboratoires", "/carriere", "/methode", "/tarifs", "/entreprises", "/a-propos", "/contact", "/faq", "/glossaire", "/verifier", "/legal/mentions", "/legal/confidentialite", "/legal/cgv", "/accessibilite"];
  const courses = (await getCatalog()).map((c) => `/formations/${c.slug}`);
  return [...pages, ...courses].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.7 }));
}
