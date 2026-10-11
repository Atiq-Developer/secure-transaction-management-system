import { prisma } from "@/lib/prisma";

export async function getSettings(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { account: true } });
  if (!user) return null;
  const loginEvents = await prisma.auditLog.findMany({ where: { userId, action: { in: ["LOGIN_SUCCESS", "LOGIN_FAILED"] } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, action: true, ipAddress: true, userAgent: true, createdAt: true } });
  return { user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status, accountNumber: user.account?.accountNumber ?? null, createdAt: user.createdAt.toISOString() }, loginEvents: loginEvents.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })) };
}