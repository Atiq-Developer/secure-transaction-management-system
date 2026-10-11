import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { listTransactionsForExport, transactionQuerySchema } from "@/services/transaction.service";

export const dynamic = "force-dynamic";

function csvEscape(value: string | null): string {
  const normalized = value ?? "";
  return /[",\n\r]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  try {
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const filters = transactionQuerySchema.parse(query);
    const transactions = await listTransactionsForExport(user.id, filters);
    const header = ["Date", "Reference", "Counterparty", "Direction", "Amount", "Status", "Note"];
    const rows = transactions.map((transaction) => [transaction.createdAt, transaction.reference, transaction.counterparty, transaction.direction, transaction.signedAmount, transaction.status, transaction.note]);
    const csv = [header, ...rows].map((row) => row.map((value) => csvEscape(value)).join(",")).join("\r\n") + "\r\n";
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="transactions-${date}.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid transaction filters" } }, { status: 400 });
    return NextResponse.json({ success: false, error: { code: "ACCOUNT_NOT_FOUND", message: "Account not found" } }, { status: 404 });
  }
}