import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { generateTransactionReference } from "@/lib/identifiers";
import { prisma } from "@/lib/prisma";

const amountSchema = z.union([z.string(), z.number()]).refine((value) => {
	const stringValue = String(value);
	return /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(stringValue) && new Prisma.Decimal(stringValue).gt(0);
}, "Amount must be greater than zero and have at most two decimal places").transform((value) => new Prisma.Decimal(String(value)));

export const transferSchema = z.object({
	toAccountNumber: z.string().trim().regex(/^\d{10}$/, "Account number must contain 10 digits"),
	amount: amountSchema,
	note: z.string().trim().max(140).optional().transform((value) => value || null),
	idempotencyKey: z.string().uuid(),
});

export type TransferErrorCode = "INSUFFICIENT_FUNDS" | "LIMIT_EXCEEDED" | "DAILY_LIMIT_EXCEEDED" | "RECIPIENT_NOT_FOUND" | "SELF_TRANSFER" | "RECIPIENT_FROZEN" | "DUPLICATE";

export class AppError extends Error {
	constructor(public readonly code: TransferErrorCode, message: string) {
		super(message);
		this.name = "AppError";
	}
}

export type TransferInput = {
	fromUserId: string;
	toAccountNumber: string;
	amount: string | number;
	note?: string;
	idempotencyKey: string;
	ip?: string;
	userAgent?: string;
};

export type TransferResult = {
	id: string;
	reference: string;
	amount: string;
	note: string | null;
	balanceAfterFrom: string | null;
	balanceAfterTo: string | null;
	createdAt: string;
	status: "COMPLETED" | "FAILED";
};

function toResult(transaction: { id: string; reference: string; amount: Prisma.Decimal; note: string | null; balanceAfterFrom: Prisma.Decimal | null; balanceAfterTo: Prisma.Decimal | null; createdAt: Date; status: "COMPLETED" | "FAILED" }): TransferResult {
	return {
		id: transaction.id,
		reference: transaction.reference,
		amount: transaction.amount.toFixed(2),
		note: transaction.note,
		balanceAfterFrom: transaction.balanceAfterFrom?.toFixed(2) ?? null,
		balanceAfterTo: transaction.balanceAfterTo?.toFixed(2) ?? null,
		createdAt: transaction.createdAt.toISOString(),
		status: transaction.status,
	};
}

function karachiDayStart(date: Date): Date {
	const karachiDate = new Date(date.getTime() + 5 * 60 * 60 * 1000);
	const year = karachiDate.getUTCFullYear();
	const month = karachiDate.getUTCMonth();
	const day = karachiDate.getUTCDate();
	return new Date(Date.UTC(year, month, day) - 5 * 60 * 60 * 1000);
}

async function auditFailure(input: TransferInput, code: TransferErrorCode, message: string): Promise<void> {
	try {
		await logAudit({
			userId: input.fromUserId,
			action: "TRANSFER_FAILED",
			ip: input.ip,
			userAgent: input.userAgent,
			metadata: { code, message, toAccountNumber: input.toAccountNumber, idempotencyKey: input.idempotencyKey },
		});
	} catch (auditError) {
		console.error("Failed to write transfer failure audit", auditError);
	}
}

export async function transferFunds(input: TransferInput): Promise<TransferResult> {
	const parsed = transferSchema.parse({ toAccountNumber: input.toAccountNumber, amount: input.amount, note: input.note, idempotencyKey: input.idempotencyKey });
	const existing = await prisma.transaction.findUnique({ where: { idempotencyKey: parsed.idempotencyKey } });
	if (existing) return toResult(existing);

	try {
		const transaction = await prisma.$transaction(async (database) => {
			const sender = await database.account.findUnique({ where: { userId: input.fromUserId }, include: { user: true } });
			const recipient = await database.account.findUnique({ where: { accountNumber: parsed.toAccountNumber }, include: { user: true } });
			if (!recipient) throw new AppError("RECIPIENT_NOT_FOUND", "Recipient account was not found");
			if (!sender) throw new AppError("RECIPIENT_NOT_FOUND", "Sender account was not found");
			if (sender.id === recipient.id) throw new AppError("SELF_TRANSFER", "You cannot transfer money to your own account");
			if (recipient.user.status === "FROZEN") throw new AppError("RECIPIENT_FROZEN", "This recipient account is frozen");

			await database.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "Account" WHERE id IN (${Prisma.join([sender.id, recipient.id])}) ORDER BY id FOR UPDATE`);
			const [lockedSender, lockedRecipient] = await Promise.all([
				database.account.findUniqueOrThrow({ where: { id: sender.id } }),
				database.account.findUniqueOrThrow({ where: { id: recipient.id } }),
			]);

			if (parsed.amount.lt(1)) throw new AppError("LIMIT_EXCEEDED", "The minimum transfer amount is PKR 1");
			if (parsed.amount.gt(100000)) throw new AppError("LIMIT_EXCEEDED", "The maximum transfer amount is PKR 100,000");
			if (lockedSender.balance.lt(parsed.amount)) throw new AppError("INSUFFICIENT_FUNDS", "Your available balance is insufficient");

			const dayStart = karachiDayStart(new Date());
			const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
			const dailyTransfers = await database.transaction.findMany({ where: { fromAccountId: lockedSender.id, type: "TRANSFER", status: "COMPLETED", createdAt: { gte: dayStart, lt: dayEnd } }, select: { amount: true } });
			const dailyTotal = dailyTransfers.reduce((total, item) => total.plus(item.amount), new Prisma.Decimal(0));
			if (dailyTotal.plus(parsed.amount).gt(200000)) throw new AppError("DAILY_LIMIT_EXCEEDED", "This transfer would exceed your PKR 200,000 daily limit");

			const senderBalance = lockedSender.balance.minus(parsed.amount);
			const recipientBalance = lockedRecipient.balance.plus(parsed.amount);
			const created = await database.transaction.create({
				data: {
					reference: generateTransactionReference(), type: "TRANSFER", status: "COMPLETED", amount: parsed.amount,
					note: parsed.note, idempotencyKey: parsed.idempotencyKey, fromAccountId: lockedSender.id, toAccountId: lockedRecipient.id,
					balanceAfterFrom: senderBalance, balanceAfterTo: recipientBalance,
				},
			});
			await database.account.update({ where: { id: lockedSender.id }, data: { balance: senderBalance } });
			await database.account.update({ where: { id: lockedRecipient.id }, data: { balance: recipientBalance } });
			return created;
		});

		await logAudit({ userId: input.fromUserId, action: "TRANSFER_SUCCESS", ip: input.ip, userAgent: input.userAgent, metadata: { reference: transaction.reference, amount: transaction.amount.toFixed(2), toAccountNumber: parsed.toAccountNumber, idempotencyKey: parsed.idempotencyKey } });
		return toResult(transaction);
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			const racedTransaction = await prisma.transaction.findUnique({ where: { idempotencyKey: parsed.idempotencyKey } });
			if (racedTransaction) return toResult(racedTransaction);
			const duplicateError = new AppError("DUPLICATE", "This transfer request was already processed");
			await auditFailure(input, duplicateError.code, duplicateError.message);
			throw duplicateError;
		}
		if (error instanceof AppError) {
			await auditFailure(input, error.code, error.message);
			throw error;
		}
		throw error;
	}
}