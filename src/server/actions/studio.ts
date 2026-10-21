"use server";

import { z } from "zod";
import { refresh, updateTag } from "next/cache";
import { requireStudio } from "@/server/auth/session";
import { run } from "./result";
import {
  addOrganizationMember,
  createDraft,
  createOrganization,
  grantManualAccess,
  removeOrganizationMember,
  reviewStep,
  saveDraft,
  setUserRole,
  setUserStatus,
  updatePlan,
  updateSettings,
} from "@/server/services/studio";
import { replyTicket, setTicketStatus } from "@/server/services/support";
import { USER_ROLES } from "@/server/db/schema/auth";

const uuid = z.uuid();

export async function createDraftAction(lessonId: string) {
  return run(async () => {
    const { actor } = await requireStudio();
    return { versionId: await createDraft(actor, uuid.parse(lessonId)) };
  });
}

export async function saveDraftAction(versionId: string, doc: unknown, changeNote: string) {
  return run(async () => {
    const { actor } = await requireStudio();
    return saveDraft(actor, uuid.parse(versionId), doc, z.string().max(500).parse(changeNote));
  });
}

export async function reviewStepAction(input: { versionId: string; step: "submit" | "technical" | "pedagogical"; decision: "approved" | "changes_requested"; comment: string }) {
  return run(async () => {
    const { actor } = await requireStudio();
    const p = z
      .object({ versionId: uuid, step: z.enum(["submit", "technical", "pedagogical"]), decision: z.enum(["approved", "changes_requested"]), comment: z.string().max(2000) })
      .parse(input);
    const r = await reviewStep(actor, p.versionId, p.step, p.decision, p.comment);
    if (r.published) {
      // Invalidation immédiate du catalogue public et de la leçon.
      updateTag("catalog");
      updateTag(`lesson:${r.slug}`);
    }
    refresh();
    return r;
  });
}

export async function setUserRoleAction(userId: string, role: string) {
  return run(async () => {
    const { actor } = await requireStudio();
    await setUserRole(actor, z.string().min(1).parse(userId), z.enum(USER_ROLES).parse(role));
    refresh();
  });
}

export async function setUserStatusAction(userId: string, status: string) {
  return run(async () => {
    const { actor } = await requireStudio();
    await setUserStatus(actor, z.string().min(1).parse(userId), z.enum(["active", "suspended"]).parse(status));
    refresh();
  });
}

export async function grantAccessAction(userId: string, tier: number, until: string | null) {
  return run(async () => {
    const { actor } = await requireStudio();
    await grantManualAccess(actor, z.string().min(1).parse(userId), z.number().int().min(0).max(2).parse(tier), until ? new Date(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(until)) : null);
    refresh();
  });
}

export async function createOrganizationAction(input: { name: string; slug: string; seats: number }) {
  return run(async () => {
    const { actor } = await requireStudio();
    const p = z.object({ name: z.string().trim().min(2).max(160), slug: z.string().regex(/^[a-z0-9-]{2,60}$/, "Identifiant : minuscules, chiffres et tirets."), seats: z.number().int().min(1).max(5000) }).parse(input);
    const id = await createOrganization(actor, p);
    refresh();
    return { id };
  });
}

export async function addMemberAction(organizationId: string, email: string, role: "org_admin" | "member") {
  return run(async () => {
    const { actor } = await requireStudio();
    await addOrganizationMember(actor, uuid.parse(organizationId), z.email().parse(email), z.enum(["org_admin", "member"]).parse(role));
    refresh();
  });
}

export async function removeMemberAction(organizationId: string, userId: string) {
  return run(async () => {
    const { actor } = await requireStudio();
    await removeOrganizationMember(actor, uuid.parse(organizationId), z.string().min(1).parse(userId));
    refresh();
  });
}

export async function updateSettingsAction(values: Record<string, string>) {
  return run(async () => {
    const { actor } = await requireStudio();
    const allowed = z.object({ "brand.name": z.string().min(2).max(80), "brand.owner": z.string().min(2).max(80), "brand.signature": z.string().max(120), "brand.contactEmail": z.email() }).parse(values);
    await updateSettings(actor, allowed);
    updateTag("settings");
    refresh();
  });
}

export async function updatePlanAction(code: string, input: { name: string; priceCents: number | null; tagline: string; features: string[]; stripePriceId: string | null; active: boolean }) {
  return run(async () => {
    const { actor } = await requireStudio();
    const p = z
      .object({
        name: z.string().trim().min(2).max(60),
        priceCents: z.number().int().min(0).max(1_000_000).nullable(),
        tagline: z.string().max(200),
        features: z.array(z.string().trim().min(1).max(160)).max(12),
        stripePriceId: z.string().regex(/^price_[A-Za-z0-9]+$/, "Identifiant de prix Stripe attendu (price_…).").nullable(),
        active: z.boolean(),
      })
      .parse(input);
    await updatePlan(actor, z.string().min(1).parse(code), p);
    updateTag("plans");
    refresh();
  });
}

export async function staffReplyTicketAction(ticketId: string, body: string) {
  return run(async () => {
    const { actor } = await requireStudio();
    await replyTicket(actor, uuid.parse(ticketId), z.string().trim().min(1).max(5000).parse(body));
    refresh();
  });
}

export async function staffTicketStatusAction(ticketId: string, status: "open" | "pending" | "resolved" | "closed") {
  return run(async () => {
    const { actor } = await requireStudio();
    await setTicketStatus(actor, uuid.parse(ticketId), status);
    refresh();
  });
}
