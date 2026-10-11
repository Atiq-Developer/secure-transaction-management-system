import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { AuthServiceError, changePassword } from "@/services/auth.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  try {
    await changePassword(user.id, await request.json());
    await logAudit({ userId: user.id, action: "PASSWORD_CHANGED", request });
    return NextResponse.json({ success: true, data: { changed: true } });
  } catch (error) {
    const message = error instanceof AuthServiceError ? error.message : "Unable to change password";
    return NextResponse.json({ success: false, error: { code: "PASSWORD_CHANGE_FAILED", message } }, { status: error instanceof AuthServiceError ? error.status : 400 });
  }
}