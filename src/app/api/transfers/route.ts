import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { AppError, transferFunds } from "@/services/transfer.service";

export const dynamic = "force-dynamic";

const errorStatus: Record<string, number> = {
  RECIPIENT_NOT_FOUND: 404,
  SELF_TRANSFER: 400,
  RECIPIENT_FROZEN: 422,
  INSUFFICIENT_FUNDS: 422,
  LIMIT_EXCEEDED: 422,
  DAILY_LIMIT_EXCEEDED: 422,
  DUPLICATE: 409,
};

export async function POST(request: Request) {
  const rate = checkRateLimit(getClientIp(request), "transfers:create", 10);
  if (!rate.allowed) return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "Too many transfer requests. Please try again shortly." } }, { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfter / 1000)) } });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  try {
    const body = await request.json() as { toAccountNumber?: string; amount?: string | number; note?: string; idempotencyKey?: string };
    const result = await transferFunds({ fromUserId: user.id, toAccountNumber: body.toAccountNumber ?? "", amount: body.amount ?? "", note: body.note, idempotencyKey: body.idempotencyKey ?? "", ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") ?? undefined });
    return NextResponse.json({ success: true, data: { transfer: result } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Enter a valid account number, amount, note, and request key" } }, { status: 400 });
    if (error instanceof AppError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: errorStatus[error.code] ?? 400 });
    return NextResponse.json({ success: false, error: { code: "TRANSFER_FAILED", message: "We could not complete this transfer" } }, { status: 500 });
  }
}