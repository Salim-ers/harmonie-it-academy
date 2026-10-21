import { NextResponse } from "next/server";
import { handleStripeEvent, verifyWebhook } from "@/server/services/billing";

/** Webhook Stripe : la signature est vérifiée sur le corps brut avant tout traitement. */
export async function POST(req: Request) {
  const raw = await req.text();
  let event;
  try {
    event = verifyWebhook(raw, req.headers.get("stripe-signature"));
  } catch {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }
  try {
    const r = await handleStripeEvent(event);
    return NextResponse.json({ received: true, duplicate: r.duplicate });
  } catch (e) {
    console.error("[stripe-webhook]", event.type, e);
    return NextResponse.json({ error: "Traitement impossible, Stripe relancera." }, { status: 500 });
  }
}
