import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getAdminOverview } from "@/services/admin.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try { await requireAdmin(); return NextResponse.json({ success: true, data: await getAdminOverview() }); }
  catch (error) { const message = error instanceof Error && error.message === "Forbidden" ? "Admin access required" : "Authentication required"; return NextResponse.json({ success: false, error: { code: message === "Admin access required" ? "FORBIDDEN" : "UNAUTHORIZED", message } }, { status: message === "Admin access required" ? 403 : 401 }); }
}