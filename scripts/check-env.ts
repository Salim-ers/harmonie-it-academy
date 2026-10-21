/**
 * Vérifie les variables d'environnement avant le déploiement (première étape de `vercel-build`).
 * Liste tous les manques d'un coup au lieu d'échouer sur le premier.
 * Les règles reprennent celles de src/lib/env.ts (non importable ici à cause de "server-only").
 */
import "dotenv/config";

const e = process.env;
const where = e.VERCEL ? `Vercel → Settings → Environment Variables (environnement ${e.VERCEL_ENV ?? "?"})` : ".env";
const errors: string[] = [];
const warnings: string[] = [];

if (!e.DATABASE_URL) errors.push("DATABASE_URL : URL PostgreSQL « pooled » de Neon (hôte en -pooler).");
if (!e.BETTER_AUTH_SECRET || e.BETTER_AUTH_SECRET.length < 32) errors.push("BETTER_AUTH_SECRET : 32 caractères minimum (openssl rand -base64 36).");
if (e.VERCEL && e.STORAGE_DRIVER !== "s3") errors.push("STORAGE_DRIVER=s3 : le stockage local est interdit sur Vercel.");
if (e.VERCEL && !e.APP_URL) errors.push("APP_URL : URL publique du site, sans barre finale (sinon la connexion pointe vers localhost).");
if (e.ADMIN_PASSWORD && (e.ADMIN_PASSWORD.length < 12 || e.ADMIN_PASSWORD.length > 128)) errors.push("ADMIN_PASSWORD : 12 à 128 caractères.");
if (!e.DATABASE_URL_UNPOOLED) warnings.push("DATABASE_URL_UNPOOLED absent : les migrations passeront par le pooler.");
if (e.VERCEL && !e.RESEND_API_KEY) warnings.push("RESEND_API_KEY absent : aucun e-mail (vérification, mot de passe) ne partira.");

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  console.error(`Variables d'environnement manquantes ou invalides — à renseigner dans ${where} :`);
  for (const m of errors) console.error(`  ✗ ${m}`);
  console.error("Voir .env.example et docs/05-deploiement.md.");
  process.exit(1);
}
console.log("Variables d'environnement : OK.");
