import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { listTransactions, transactionQuerySchema } from "@/services/transaction.service";

export const dynamic = "force-dynamic";

function queryInput(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  try {
    const input = transactionQuerySchema.parse(queryInput(request));
    return NextResponse.json({ success: true, data: await listTransactions(user.id, input) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid transaction filters" } }, { status: 400 });
    return NextResponse.json({ success: false, error: { code: "ACCOUNT_NOT_FOUND", message: "Account not found" } }, { status: 404 });
  }
}