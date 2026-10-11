import { NextResponse } from "next/server";
import { signJwt } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { AuthServiceError, register } from "@/services/auth.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rate = checkRateLimit(getClientIp(request), "auth:register", 10);
  if (!rate.allowed) return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "Too many registration attempts. Please try again shortly." } }, { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfter / 1000)) } });
  try {
    const user = await register(await request.json());
    await setSessionCookie(await signJwt({ userId: user.id, role: user.role }));
    await logAudit({ userId: user.id, action: "REGISTER", request, metadata: { email: user.email } });
    return NextResponse.json({ success: true, data: { user } }, { status: 201 });
  } catch (error) {
    const message = error instanceof AuthServiceError ? error.message : "Unable to create account";
    const status = error instanceof AuthServiceError ? error.status : 400;
    return NextResponse.json({ success: false, error: { code: "REGISTER_FAILED", message } }, { status });
  }
}