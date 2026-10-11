import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { AuthServiceError, login } from "@/services/auth.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rate = checkRateLimit(getClientIp(request), "auth:login", 10);
  if (!rate.allowed) return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "Too many login attempts. Please try again shortly." } }, { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfter / 1000)) } });
  try {
    const result = await login(await request.json());
    await setSessionCookie(result.token);
    await logAudit({ userId: result.user.id, action: "LOGIN_SUCCESS", request });
    return NextResponse.json({ success: true, data: { user: result.user } });
  } catch (error) {
    const authError = error instanceof AuthServiceError ? error : null;
    if (authError?.userId) {
      await logAudit({ userId: authError.userId, action: "LOGIN_FAILED", request, metadata: { locked: authError.locked } });
      if (authError.locked) await logAudit({ userId: authError.userId, action: "ACCOUNT_LOCKED", request, metadata: { minutes: 15 } });
    }
    return NextResponse.json({ success: false, error: { code: "LOGIN_FAILED", message: "Invalid email or password" } }, { status: 401 });
  }
}