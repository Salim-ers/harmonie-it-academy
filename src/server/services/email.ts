import "server-only";
import { Resend } from "resend";
import { env, features } from "@/lib/env";
import { getDb } from "@/server/db";
import { devOutbox } from "@/server/db/schema";

export type Email = { to: string; subject: string; text: string; html?: string };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Gabarit sobre et lisible dans tous les clients mail (pas d'image distante, pas de traceur). */
export function layout({ title, intro, cta, outro }: { title: string; intro: string; cta?: { label: string; url: string }; outro?: string }) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.url)}" style="background:#101114;color:#fafaf8;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p><p style="color:#5a5f6b;font-size:13px">Si le bouton ne fonctionne pas, copiez ce lien : ${escapeHtml(cta.url)}</p>`
    : "";
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#fafaf8;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#25272e"><div style="max-width:520px;margin:0 auto;padding:40px 24px"><p style="font-weight:700;color:#101114">Harmonie IT Academy</p><h1 style="font-size:22px;color:#101114">${escapeHtml(title)}</h1><p style="line-height:1.6">${escapeHtml(intro)}</p>${button}${outro ? `<p style="line-height:1.6;color:#5a5f6b">${escapeHtml(outro)}</p>` : ""}<p style="margin-top:40px;font-size:12px;color:#8e94a1">Harmonie IT Academy, une marque de Harmonie Solutions.</p></div></body></html>`;
  const text = `${title}\n\n${intro}\n\n${cta ? `${cta.label} : ${cta.url}\n\n` : ""}${outro ?? ""}`;
  return { html, text };
}

export async function sendEmail(mail: Email) {
  const e = env();
  if (features.email()) {
    const resend = new Resend(e.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: e.EMAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
    if (error) throw new Error(`Envoi d'e-mail impossible : ${error.message}`);
    return;
  }
  if (e.NODE_ENV === "production" && !process.env.CI) {
    // Ne jamais « réussir » silencieusement en production sans fournisseur configuré.
    throw new Error("Aucun fournisseur d'e-mail n'est configuré (RESEND_API_KEY).");
  }
  if (e.EMAIL_DEV_OUTBOX === "1") {
    await getDb().insert(devOutbox).values({ to: mail.to, subject: mail.subject, text: mail.text });
  }
  console.info(`[e-mail de développement] à ${mail.to} : ${mail.subject}`);
}
