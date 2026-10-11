import { Prisma, Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(10) });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function dateRange(from?: string, to?: string) {
	const end = to ? new Date(`${to}T00:00:00.000Z`) : null;
	if (end) end.setUTCDate(end.getUTCDate() + 1);
	return from || to ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(end ? { lt: end } : {}) } } : {};
}

function money(value: Prisma.Decimal): string { return value.toFixed(2); }
function dayStart(date: Date): Date { const start = new Date(date); start.setUTCHours(0, 0, 0, 0); return start; }
export const userQuerySchema = pageSchema.extend({ search: z.string().trim().max(100).default(""), status: z.enum(["all", "ACTIVE", "FROZEN"]).default("all") });
export const adminTransactionQuerySchema = pageSchema.extend({ status: z.enum(["all", "COMPLETED", "FAILED"]).default("all"), from: dateSchema.optional(), to: dateSchema.optional(), minAmount: z.coerce.number().nonnegative().optional(), maxAmount: z.coerce.number().nonnegative().optional(), search: z.string().trim().max(100).default("") });
export const auditQuerySchema = pageSchema.extend({ action: z.string().trim().max(80).default(""), user: z.string().trim().max(100).default(""), from: dateSchema.optional(), to: dateSchema.optional() });

export async function getAdminOverview() {
	const now = new Date();
	const today = dayStart(now);
	const fourteenDaysAgo = new Date(today.getTime() - 13 * 86400000);
	const [totalUsers, activeUsers, frozenUsers, totalTransactions, totalVolume, todayVolume, failedTransfersToday, volumeTransactions, latestAuditLogs, latestFailedTransfers] = await prisma.$transaction([
		prisma.user.count(), prisma.user.count({ where: { status: "ACTIVE" } }), prisma.user.count({ where: { status: "FROZEN" } }),
		prisma.transaction.count(), prisma.transaction.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
		prisma.transaction.aggregate({ where: { status: "COMPLETED", createdAt: { gte: today } }, _sum: { amount: true } }),
		prisma.transaction.count({ where: { type: "TRANSFER", status: "FAILED", createdAt: { gte: today } } }),
		prisma.transaction.findMany({ where: { status: "COMPLETED", createdAt: { gte: fourteenDaysAgo } }, select: { amount: true, createdAt: true } }),
		prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { user: { select: { fullName: true, email: true } } } }),
		prisma.transaction.findMany({ where: { type: "TRANSFER", status: "FAILED" }, take: 5, orderBy: { createdAt: "desc" }, include: { fromAccount: { include: { user: { select: { fullName: true } } } }, toAccount: { include: { user: { select: { fullName: true } } } } } }),
	]);
	const volumeMap = new Map<string, Prisma.Decimal>();
	for (let index = 0; index < 14; index += 1) { const date = new Date(fourteenDaysAgo.getTime() + index * 86400000); volumeMap.set(date.toISOString().slice(0, 10), new Prisma.Decimal(0)); }
	for (const item of volumeTransactions) { const key = item.createdAt.toISOString().slice(0, 10); volumeMap.set(key, (volumeMap.get(key) ?? new Prisma.Decimal(0)).plus(item.amount)); }
	return {
		kpis: { totalUsers, activeUsers, frozenUsers, totalTransactions, totalVolume: money(totalVolume._sum.amount ?? new Prisma.Decimal(0)), todayVolume: money(todayVolume._sum.amount ?? new Prisma.Decimal(0)), failedTransfersToday },
		volumePerDay: Array.from(volumeMap, ([date, amount]) => ({ date, amount: money(amount) })),
		latestAuditLogs: latestAuditLogs.map((log) => ({ id: log.id, action: log.action, user: log.user?.fullName ?? "System", ipAddress: log.ipAddress, metadata: log.metadata, createdAt: log.createdAt.toISOString() })),
		latestFailedTransfers: latestFailedTransfers.map((transaction) => ({ id: transaction.id, reference: transaction.reference, sender: transaction.fromAccount?.user.fullName ?? "Unknown", recipient: transaction.toAccount?.user.fullName ?? "Unknown", amount: money(transaction.amount), failureReason: transaction.failureReason, createdAt: transaction.createdAt.toISOString() })),
	};
}

export async function listAdminUsers(input: unknown) {
	const filters = userQuerySchema.parse(input);
	const where: Prisma.UserWhereInput = { ...(filters.status !== "all" ? { status: filters.status as UserStatus } : {}) };
	if (filters.search) where.OR = [{ fullName: { contains: filters.search, mode: "insensitive" } }, { email: { contains: filters.search, mode: "insensitive" } }, { account: { accountNumber: { contains: filters.search } } }];
	const [total, users] = await prisma.$transaction([prisma.user.count({ where }), prisma.user.findMany({ where, include: { account: true }, orderBy: { createdAt: "desc" }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize })]);
	return { items: users.map((user) => ({ id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status, accountNumber: user.account?.accountNumber ?? null, balance: user.account ? money(user.account.balance) : null, createdAt: user.createdAt.toISOString() })), meta: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function setUserStatus(adminId: string, targetId: string, status: UserStatus, request?: Request) {
	const target = await prisma.user.findUnique({ where: { id: targetId } });
	if (!target) throw new Error("USER_NOT_FOUND");
	if (target.id === adminId || target.role === Role.ADMIN) throw new Error("ADMIN_TARGET_FORBIDDEN");
	const updated = await prisma.user.update({ where: { id: targetId }, data: { status } });
	await logAudit({ userId: adminId, action: status === "FROZEN" ? "USER_FROZEN" : "USER_UNFROZEN", request, metadata: { adminId, targetUserId: targetId } });
	return { id: updated.id, status: updated.status };
}

export async function listAdminTransactions(input: unknown) {
	const filters = adminTransactionQuerySchema.parse(input);
	const where: Prisma.TransactionWhereInput = { ...(filters.status !== "all" ? { status: filters.status as "COMPLETED" | "FAILED" } : {}), ...dateRange(filters.from, filters.to), ...(filters.minAmount !== undefined || filters.maxAmount !== undefined ? { amount: { ...(filters.minAmount !== undefined ? { gte: filters.minAmount } : {}), ...(filters.maxAmount !== undefined ? { lte: filters.maxAmount } : {}) } } : {}) };
	if (filters.search) where.OR = [{ reference: { contains: filters.search, mode: "insensitive" } }, { fromAccount: { accountNumber: { contains: filters.search } } }, { toAccount: { accountNumber: { contains: filters.search } } }];
	const include = { fromAccount: { include: { user: { select: { fullName: true } } } }, toAccount: { include: { user: { select: { fullName: true } } } } } as const;
	const [total, transactions] = await prisma.$transaction([prisma.transaction.count({ where }), prisma.transaction.findMany({ where, include, orderBy: { createdAt: "desc" }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize })]);
	return { items: transactions.map((transaction) => ({ id: transaction.id, reference: transaction.reference, type: transaction.type, status: transaction.status, amount: money(transaction.amount), sender: transaction.fromAccount?.user.fullName ?? "System", recipient: transaction.toAccount?.user.fullName ?? "External", createdAt: transaction.createdAt.toISOString(), failureReason: transaction.failureReason })), meta: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function listAuditLogs(input: unknown) {
	const filters = auditQuerySchema.parse(input);
	const where: Prisma.AuditLogWhereInput = { ...(filters.action ? { action: { contains: filters.action, mode: "insensitive" } } : {}), ...dateRange(filters.from, filters.to) };
	if (filters.user) where.user = { OR: [{ fullName: { contains: filters.user, mode: "insensitive" } }, { email: { contains: filters.user, mode: "insensitive" } }] };
	const [total, logs] = await prisma.$transaction([prisma.auditLog.count({ where }), prisma.auditLog.findMany({ where, include: { user: { select: { fullName: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize })]);
	return { items: logs.map((log) => ({ id: log.id, action: log.action, user: log.user?.fullName ?? "System", email: log.user?.email ?? null, ipAddress: log.ipAddress, userAgent: log.userAgent, metadata: log.metadata, createdAt: log.createdAt.toISOString() })), meta: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}