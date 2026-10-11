import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/services/settings.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  const settings = await getSettings(user.id);
  if (!settings) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
  return NextResponse.json({ success: true, data: settings });
}