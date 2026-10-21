// "server-only" lève une erreur hors de React Server Components : neutralisé dans les tests Node.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
// next/cache et next/headers n'ont pas de sens hors d'une requête Next : versions inertes.
vi.mock("next/cache", () => ({ updateTag: () => {}, revalidateTag: () => {}, refresh: () => {}, cacheTag: () => {}, cacheLife: () => {} }));

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://hia:hia_dev_only@localhost:5432/harmonie_test";
process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret-0123456789";
process.env.APP_URL = "http://localhost:3000";
process.env.EMAIL_DEV_OUTBOX = "1";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_for_unit_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests";
