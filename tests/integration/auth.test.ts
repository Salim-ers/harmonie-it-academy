/**
 * Authentification réelle via le routeur Better Auth (requêtes HTTP simulées) :
 * inscription, vérification d'e-mail obligatoire, connexion, suspension, limitation des tentatives.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { desc, eq } from "drizzle-orm";
import { getAuth } from "@/server/auth/auth";
import { getDb } from "@/server/db";
import { devOutbox, user } from "@/server/db/schema";
import { prepareDatabase } from "./helpers";

const BASE = "http://localhost:3000/api/auth";
const json = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  getAuth().handler(new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": headers["x-forwarded-for"] ?? "10.0.0.1", ...headers }, body: JSON.stringify(body) }));

beforeAll(() => prepareDatabase(), 180_000);

describe("authentification", () => {
  const email = `inscription-${Date.now()}@test.local`;
  const password = "une phrase de passe solide 42";

  it("inscription puis connexion refusée tant que l'e-mail n'est pas vérifié", async () => {
    const r = await json("/sign-up/email", { name: "Nouvelle Apprenante", email, password });
    expect(r.status).toBe(200);
    const login = await json("/sign-in/email", { email, password });
    expect(login.status).toBe(403);
    const body = (await login.json()) as { code?: string };
    expect(body.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("refuse un mot de passe trop court", async () => {
    const r = await json("/sign-up/email", { name: "X", email: `court-${Date.now()}@test.local`, password: "court" });
    expect(r.status).toBe(400);
  });

  it("le lien reçu par e-mail vérifie l'adresse et la connexion ouvre une session", async () => {
    const [mail] = await getDb().select().from(devOutbox).where(eq(devOutbox.to, email)).orderBy(desc(devOutbox.createdAt)).limit(1);
    const url = mail.text.match(/https?:\/\/\S+/)?.[0];
    expect(url).toBeTruthy();
    const verify = await getAuth().handler(new Request(url!, { method: "GET" }));
    expect([200, 302]).toContain(verify.status);
    const [u] = await getDb().select().from(user).where(eq(user.email, email));
    expect(u.emailVerified).toBe(true);
    expect(u.role).toBe("student");
    const login = await json("/sign-in/email", { email, password }, { "x-forwarded-for": "10.0.0.2" });
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("hia.session_token");
    expect(cookie.toLowerCase()).toContain("httponly");
    const session = await getAuth().api.getSession({ headers: new Headers({ cookie: cookie.split(";")[0] }) });
    expect(session?.user.email).toBe(email);
  });

  it("le rôle ne peut pas être choisi à l'inscription", async () => {
    const e = `role-${Date.now()}@test.local`;
    await json("/sign-up/email", { name: "Pirate", email: e, password, role: "super_admin" }, { "x-forwarded-for": "10.0.0.3" });
    const [u] = await getDb().select().from(user).where(eq(user.email, e));
    expect(u?.role ?? "student").toBe("student");
  });

  it("un compte suspendu ne peut plus ouvrir de session", async () => {
    await getDb().update(user).set({ status: "suspended" }).where(eq(user.email, email));
    const login = await json("/sign-in/email", { email, password }, { "x-forwarded-for": "10.0.0.4" });
    expect(login.status).not.toBe(200);
    await getDb().update(user).set({ status: "active" }).where(eq(user.email, email));
  });

  it("les tentatives de connexion répétées sont limitées", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) statuses.push((await json("/sign-in/email", { email, password: "mauvais mot de passe" }, { "x-forwarded-for": "10.9.9.9" })).status);
    expect(statuses).toContain(429);
  });
});
