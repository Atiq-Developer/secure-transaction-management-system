import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { adminTransactionQuerySchema, listAdminTransactions } from "@/services/admin.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try { await requireAdmin(); const input = adminTransactionQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries())); return NextResponse.json({ success: true, data: await listAdminTransactions(input) }); }
  catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid transaction filters" } }, { status: 400 }); const forbidden = error instanceof Error && error.message === "Forbidden"; return NextResponse.json({ success: false, error: { code: forbidden ? "FORBIDDEN" : "UNAUTHORIZED", message: forbidden ? "Admin access required" : "Authentication required" } }, { status: forbidden ? 403 : 401 }); }
}