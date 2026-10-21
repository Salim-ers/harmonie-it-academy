import { NextResponse } from "next/server";
import { getAuth } from "@/server/auth/auth";
import { exportUserData } from "@/server/services/privacy";
import { recordAudit } from "@/server/services/audit";
import { consumeRateLimit, RateLimitError } from "@/server/services/rate-limit";

export async function GET(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  try {
    await consumeRateLimit(`export:${session.user.id}`, 5, 86400);
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    throw e;
  }
  const data = await exportUserData(session.user.id);
  await recordAudit({ actorId: session.user.id, action: "privacy.export", targetType: "user", targetId: session.user.id });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="harmonie-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
