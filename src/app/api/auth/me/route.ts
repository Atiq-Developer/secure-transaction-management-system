import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  return NextResponse.json({ success: true, data: { user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status } } });
}