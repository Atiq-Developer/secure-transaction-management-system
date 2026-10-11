import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAccountSummary } from "@/services/account.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await getAccountSummary(user.id) });
  } catch {
    return NextResponse.json({ success: false, error: { code: "ACCOUNT_NOT_FOUND", message: "Account not found" } }, { status: 404 });
  }
}