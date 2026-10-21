"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { run } from "./result";
import { createCheckout, createPortal } from "@/server/services/billing";
import { consumeRateLimit } from "@/server/services/rate-limit";

export async function checkoutAction(planCode: string) {
  return run(async () => {
    const u = await requireUser();
    await consumeRateLimit(`checkout:${u.id}`, 10, 3600);
    return { url: await createCheckout(u.id, z.enum(["academy", "pro"]).parse(planCode)) };
  });
}

export async function portalAction() {
  return run(async () => {
    const u = await requireUser();
    return { url: await createPortal(u.id) };
  });
}
