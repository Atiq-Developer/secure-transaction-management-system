import { Prisma, TransactionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(["all", "sent", "received"]).default("all"),
  status: z.enum(["all", "COMPLETED", "FAILED"]).default("all"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().trim().max(100).default(""),
  sort: z.enum(["newest", "oldest", "amount"]).default("newest"),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
type TransactionWithAccounts = Prisma.TransactionGetPayload<{ include: { fromAccount: { include: { user: { select: { fullName: true } } } }; toAccount: { include: { user: { select: { fullName: true } } } } } }>;

function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : `${parts[0]} ${parts[0][0]}.`;
}

function dateBoundary(value: string, end = false): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (end) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function toListItem(transaction: TransactionWithAccounts, accountId: string) {
  const credit = transaction.toAccountId === accountId;
  const otherAccount = credit ? transaction.fromAccount : transaction.toAccount;
  const counterparty = otherAccount?.user.fullName ?? (transaction.type === "DEPOSIT" ? "SecureTx" : "Account activity");
  const amount = transaction.amount.toFixed(2);
  return {
    id: transaction.id,
    reference: transaction.reference,
    type: transaction.type,
    status: transaction.status,
    direction: credit ? "CREDIT" as const : "DEBIT" as const,
    counterparty: maskName(counterparty),
    note: transaction.note,
    amount,
    signedAmount: `${credit ? "+" : "-"}${amount}`,
    balanceAfter: credit ? transaction.balanceAfterTo?.toFixed(2) ?? null : transaction.balanceAfterFrom?.toFixed(2) ?? null,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function buildWhere(accountId: string, filters: TransactionQuery): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {
    ...(filters.type === "sent" ? { fromAccountId: accountId } : filters.type === "received" ? { toAccountId: accountId } : { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] }),
    ...(filters.status !== "all" ? { status: filters.status as TransactionStatus } : {}),
    ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: dateBoundary(filters.from) } : {}), ...(filters.to ? { lt: dateBoundary(filters.to, true) } : {}) } } : {}),
  };
  if (filters.q) {
    where.AND = [{ OR: [
      { reference: { contains: filters.q, mode: "insensitive" } },
      { note: { contains: filters.q, mode: "insensitive" } },
      { fromAccount: { user: { fullName: { contains: filters.q, mode: "insensitive" } } } },
      { toAccount: { user: { fullName: { contains: filters.q, mode: "insensitive" } } } },
    ] }];
  }
  return where;
}

const includeAccounts = { fromAccount: { include: { user: { select: { fullName: true } } } }, toAccount: { include: { user: { select: { fullName: true } } } } } as const;

export async function listTransactions(userId: string, input: Partial<TransactionQuery>) {
  const filters = transactionQuerySchema.parse(input);
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) throw new Error("Account not found");
  const where = buildWhere(account.id, filters);
  const orderBy = filters.sort === "oldest" ? { createdAt: "asc" as const } : filters.sort === "amount" ? { amount: "desc" as const } : { createdAt: "desc" as const };
  const [total, transactions] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({ where, include: includeAccounts, orderBy, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
  ]);
  return { items: transactions.map((transaction) => toListItem(transaction, account.id)), meta: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) }, filters };
}

export async function getTransactionDetails(userId: string, id: string) {
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) return null;
  const transaction = await prisma.transaction.findFirst({ where: { id, OR: [{ fromAccountId: account.id }, { toAccountId: account.id }] }, include: includeAccounts });
  return transaction ? toListItem(transaction, account.id) : null;
}

export async function listTransactionsForExport(userId: string, input: Partial<TransactionQuery>) {
  const filters = transactionQuerySchema.parse({ ...input, page: 1, pageSize: 50 });
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) throw new Error("Account not found");
  const where = buildWhere(account.id, filters);
  const orderBy = filters.sort === "oldest" ? { createdAt: "asc" as const } : filters.sort === "amount" ? { amount: "desc" as const } : { createdAt: "desc" as const };
  const transactions = await prisma.transaction.findMany({ where, include: includeAccounts, orderBy });
  return transactions.map((transaction) => toListItem(transaction, account.id));
}