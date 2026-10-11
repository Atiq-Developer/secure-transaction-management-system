import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { clearSessionCookie, getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  await clearSessionCookie();
  if (user) await logAudit({ userId: user.id, action: "LOGOUT", request });
  return NextResponse.json({ success: true, data: { loggedOut: true } });
}