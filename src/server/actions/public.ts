"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { consumeRateLimit } from "@/server/services/rate-limit";
import { sendEmail } from "@/server/services/email";
import { getSettings } from "@/server/services/catalog";

export type ContactState = { error?: string; sent?: boolean };

/** Formulaire de contact et demande de devis entreprise. Champ piège anti-robots, limite par IP. */
export async function contactAction(_prev: ContactState, form: FormData): Promise<ContactState> {
  if (form.get("website")) return { sent: true };
  const p = z
    .object({
      kind: z.enum(["contact", "business"]),
      name: z.string().trim().min(2, "Indiquez votre nom.").max(120),
      email: z.email("Adresse e-mail invalide."),
      company: z.string().trim().max(160).optional(),
      seats: z.string().trim().max(20).optional(),
      message: z.string().trim().min(10, "Votre message est trop court.").max(4000),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
  try {
    await consumeRateLimit(`contact:${ip}`, 5, 3600);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const settings = await getSettings();
  const d = p.data;
  await sendEmail({
    to: settings.contactEmail,
    subject: d.kind === "business" ? `Demande Business : ${d.company ?? d.name}` : `Contact : ${d.name}`,
    text: `De : ${d.name} <${d.email}>\nEntreprise : ${d.company ?? "-"}\nNombre de salariés à former : ${d.seats ?? "-"}\n\n${d.message}`,
  });
  return { sent: true };
}
