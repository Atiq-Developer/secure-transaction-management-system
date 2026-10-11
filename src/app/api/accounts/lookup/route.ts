import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const lookupSchema = z.string().regex(/^\d{10}$/);
const requests = new Map<string, { count: number; resetAt: number }>();

function maskedName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0]} ${parts[0][0]}.`;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const current = requests.get(ip);
  if (!current || current.resetAt <= now) requests.set(ip, { count: 1, resetAt: now + 60_000 });
  else if (current.count >= 30) return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "Too many lookups. Try again shortly." } }, { status: 429 });
  else current.count += 1;

  const accountNumber = new URL(request.url).searchParams.get("accountNumber") ?? "";
  const parsed = lookupSchema.safeParse(accountNumber);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Enter a valid 10-digit account number" } }, { status: 400 });
  const account = await prisma.account.findUnique({ where: { accountNumber: parsed.data }, include: { user: { select: { fullName: true, status: true } } } });
  if (!account) return NextResponse.json({ success: true, data: { recipient: null, verified: false } });
  return NextResponse.json({ success: true, data: { recipient: maskedName(account.user.fullName), verified: account.user.status === "ACTIVE" } });
}