import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getTransactionDetails } from "@/services/transaction.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  void request;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  const { id } = await context.params;
  const transaction = await getTransactionDetails(user.id, id);
  if (!transaction) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Transaction not found" } }, { status: 404 });
  return NextResponse.json({ success: true, data: { transaction } });
}