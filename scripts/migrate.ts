/**
 * Applique les migrations SQL versionnées (dossier drizzle/).
 * Utilisé en local, en CI et au déploiement (voir docs/05-deploiement.md).
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  const started = Date.now();
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log(`Migrations appliquées en ${Date.now() - started} ms.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
