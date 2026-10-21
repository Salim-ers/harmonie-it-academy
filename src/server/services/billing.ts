import "server-only";
import Stripe from "stripe";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { billingCustomers, invoices, notifications, plans, stripeEvents, subscriptions, user } from "@/server/db/schema";
import { env, features } from "@/lib/env";
import { upsertEntitlement } from "./entitlements";
import { recordAudit } from "./audit";

export class BillingError extends Error {}

let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!features.stripe()) throw new BillingError("Le paiement en ligne n'est pas encore configuré.");
  stripe ??= new Stripe(env().STRIPE_SECRET_KEY!, { appInfo: { name: "Harmonie IT Academy" }, maxNetworkRetries: 2 });
  return stripe;
}

/** Statuts Stripe qui ouvrent l'accès payant. past_due : période de grâce jusqu'à la fin de la période payée. */
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

async function getOrCreateCustomer(db: Db, userId: string) {
  const [existing] = await db.select().from(billingCustomers).where(eq(billingCustomers.userId, userId)).limit(1);
  if (existing) return existing.stripeCustomerId;
  const [u] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId));
  const c = await getStripe().customers.create({ email: u.email, name: u.name, metadata: { userId } }, { idempotencyKey: `customer-${userId}` });
  await db.insert(billingCustomers).values({ userId, stripeCustomerId: c.id }).onConflictDoNothing();
  return c.id;
}

export async function createCheckout(userId: string, planCode: string, db: Db = getDb()) {
  const [plan] = await db.select().from(plans).where(and(eq(plans.code, planCode), eq(plans.active, true))).limit(1);
  if (!plan || plan.tier === 0 || plan.interval === "custom") throw new BillingError("Cette offre ne se souscrit pas en ligne.");
  if (!plan.stripePriceId) throw new BillingError("Cette offre n'est pas encore reliée à un prix Stripe (à configurer dans Harmonie Studio).");
  const active = await db.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, [...ACCESS_STATUSES])));
  if (active.length) throw new BillingError("Vous avez déjà un abonnement actif : changez d'offre depuis le portail de facturation.");
  const customer = await getOrCreateCustomer(db, userId);
  const base = env().APP_URL;
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: userId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    metadata: { userId, planCode: plan.code },
    subscription_data: { metadata: { userId, planCode: plan.code } },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    locale: "fr",
    success_url: `${base}/campus/facturation?statut=merci`,
    cancel_url: `${base}/campus/facturation?statut=annule`,
  });
  if (!session.url) throw new BillingError("Stripe n'a pas renvoyé de page de paiement.");
  return session.url;
}

export async function createPortal(userId: string, db: Db = getDb()) {
  const [c] = await db.select().from(billingCustomers).where(eq(billingCustomers.userId, userId)).limit(1);
  if (!c) throw new BillingError("Aucun compte de facturation pour l'instant.");
  const s = await getStripe().billingPortal.sessions.create({ customer: c.stripeCustomerId, return_url: `${env().APP_URL}/campus/facturation`, locale: "fr" });
  return s.url;
}

async function resolveUserId(db: Db, customerId: string, metadataUserId?: string | null) {
  if (metadataUserId) {
    const [u] = await db.select({ id: user.id }).from(user).where(eq(user.id, metadataUserId)).limit(1);
    if (u) return u.id;
  }
  const [c] = await db.select().from(billingCustomers).where(eq(billingCustomers.stripeCustomerId, customerId)).limit(1);
  return c?.userId ?? null;
}

/**
 * Synchronise un abonnement et les droits d'accès à partir de l'objet Stripe — seule source de vérité.
 * Jamais à partir d'une redirection de succès côté navigateur.
 */
export async function syncSubscription(db: Db, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = await resolveUserId(db, customerId, sub.metadata?.userId);
  if (!userId) throw new Error(`Abonnement ${sub.id} : utilisateur introuvable pour le client ${customerId}`);
  await db.insert(billingCustomers).values({ userId, stripeCustomerId: customerId }).onConflictDoNothing();
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const [plan] = priceId ? await db.select().from(plans).where(eq(plans.stripePriceId, priceId)).limit(1) : [];
  const planCode = plan?.code ?? sub.metadata?.planCode ?? "inconnu";
  const tier = plan?.tier ?? (planCode === "pro" ? 2 : planCode === "academy" ? 1 : 0);
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  await db
    .insert(subscriptions)
    .values({ userId, stripeSubscriptionId: sub.id, stripeCustomerId: customerId, planCode, status: sub.status, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: sub.cancel_at_period_end })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: { planCode, status: sub.status, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: sub.cancel_at_period_end, updatedAt: new Date() },
    });
  await upsertEntitlement(db, {
    userId,
    source: "subscription",
    sourceRef: sub.id,
    tier,
    validUntil: periodEnd,
    active: ACCESS_STATUSES.has(sub.status),
  });
  return { userId, planCode, status: sub.status };
}

export async function handleStripeEvent(event: Stripe.Event, db: Db = getDb()) {
  // Idempotence : un événement déjà traité est ignoré (Stripe peut le renvoyer).
  const inserted = await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning({ id: stripeEvents.id });
  if (!inserted.length) return { duplicate: true };
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        if (s.mode === "subscription" && s.subscription) {
          const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
          const sub = await getStripe().subscriptions.retrieve(subId);
          const r = await syncSubscription(db, sub);
          await recordAudit({ actorId: r.userId, action: "billing.subscribed", targetType: "subscription", targetId: subId, metadata: { plan: r.planCode } });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const r = await syncSubscription(db, event.data.object);
        if (event.type === "customer.subscription.deleted") {
          await recordAudit({ actorId: r.userId, action: "billing.subscription_ended", targetType: "subscription", targetId: event.data.object.id });
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized": {
        const inv = event.data.object;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (!customerId || !inv.id) break;
        const userId = await resolveUserId(db, customerId, null);
        if (!userId) break;
        await db
          .insert(invoices)
          .values({ userId, stripeInvoiceId: inv.id, amountCents: inv.amount_due, currency: inv.currency, status: inv.status ?? "unknown", hostedUrl: inv.hosted_invoice_url ?? null })
          .onConflictDoUpdate({ target: invoices.stripeInvoiceId, set: { status: inv.status ?? "unknown", hostedUrl: inv.hosted_invoice_url ?? null, amountCents: inv.amount_due } });
        if (event.type === "invoice.payment_failed") {
          await db.insert(notifications).values({
            userId,
            kind: "billing",
            title: "Le paiement de votre abonnement a échoué",
            body: "Mettez à jour votre moyen de paiement depuis l'espace Abonnement pour conserver votre accès.",
            href: "/campus/facturation",
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // En cas d'échec, on libère l'événement pour que la relance de Stripe soit traitée.
    await db.delete(stripeEvents).where(eq(stripeEvents.id, event.id));
    throw e;
  }
  return { duplicate: false };
}

export function verifyWebhook(rawBody: string, signature: string | null): Stripe.Event {
  if (!signature) throw new BillingError("Signature absente.");
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new BillingError("Webhook non configuré.");
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function getBillingOverview(userId: string, db: Db = getDb()) {
  const [subs, invs] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.updatedAt)),
    db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt)).limit(24),
  ]);
  return { subscriptions: subs, invoices: invs, hasActive: subs.some((s) => ACCESS_STATUSES.has(s.status)) };
}

export async function hasActiveSubscription(userId: string, db: Db = getDb()) {
  const rows = await db.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, [...ACCESS_STATUSES])));
  return rows.length > 0;
}
