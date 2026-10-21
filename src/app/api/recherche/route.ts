import { NextResponse } from "next/server";
import { getAuth } from "@/server/auth/auth";
import { getUserTier } from "@/server/services/entitlements";
import { searchContent } from "@/server/services/search";
import { consumeRateLimit, RateLimitError } from "@/server/services/rate-limit";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const session = await getAuth().api.getSession({ headers: req.headers });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  try {
    await consumeRateLimit(`search:${session?.user.id ?? ip}`, 120, 60);
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    throw e;
  }
  const tier = session ? await getUserTier(session.user.id) : 0;
  const hits = await searchContent(q, tier);
  return NextResponse.json({ hits }, { headers: { "Cache-Control": "private, no-store" } });
}
