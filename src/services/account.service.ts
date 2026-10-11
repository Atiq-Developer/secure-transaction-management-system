import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const zero = new Prisma.Decimal(0);

function dateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function money(value: Prisma.Decimal): string {
	return value.toFixed(2);
}

function karachiDayStart(date: Date): Date {
	const karachiDate = new Date(date.getTime() + 5 * 60 * 60 * 1000);
	return new Date(Date.UTC(karachiDate.getUTCFullYear(), karachiDate.getUTCMonth(), karachiDate.getUTCDate()) - 5 * 60 * 60 * 1000);
}

export async function getAccountSummary(userId: string) {
	const account = await prisma.account.findUnique({ where: { userId } });
	if (!account) throw new Error("Account not found");

	const now = new Date();
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const chartStart = new Date(now);
	chartStart.setUTCHours(0, 0, 0, 0);
	chartStart.setUTCDate(chartStart.getUTCDate() - 6);

	const transactions = await prisma.transaction.findMany({
		where: {
			status: "COMPLETED",
			createdAt: { gte: chartStart },
			OR: [{ fromAccountId: account.id }, { toAccountId: account.id }],
		},
		include: {
			fromAccount: { include: { user: { select: { fullName: true } } } },
			toAccount: { include: { user: { select: { fullName: true } } } },
		},
		orderBy: { createdAt: "desc" },
	});

	const monthlyTransactions = await prisma.transaction.findMany({
		where: {
			status: "COMPLETED",
			createdAt: { gte: monthStart },
			OR: [{ fromAccountId: account.id }, { toAccountId: account.id }],
		},
		select: { amount: true, fromAccountId: true, toAccountId: true },
	});
	const dailyTransactions = await prisma.transaction.findMany({
		where: { fromAccountId: account.id, type: "TRANSFER", status: "COMPLETED", createdAt: { gte: karachiDayStart(now), lt: new Date(karachiDayStart(now).getTime() + 24 * 60 * 60 * 1000) } },
		select: { amount: true },
	});

	let received = zero;
	let sent = zero;
	for (const transaction of monthlyTransactions) {
		if (transaction.toAccountId === account.id) received = received.plus(transaction.amount);
		if (transaction.fromAccountId === account.id) sent = sent.plus(transaction.amount);
	}
	const dailyOutgoing = dailyTransactions.reduce((total, item) => total.plus(item.amount), zero);
	const dailyLimit = new Prisma.Decimal(200000);
	const remainingDailyLimit = dailyOutgoing.gte(dailyLimit) ? zero : dailyLimit.minus(dailyOutgoing);

	const chart = Array.from({ length: 7 }, (_, index) => {
		const date = new Date(chartStart);
		date.setUTCDate(chartStart.getUTCDate() + index);
		return { date: dateKey(date), label: date.toLocaleDateString("en-PK", { weekday: "short", timeZone: "UTC" }), received: zero, sent: zero };
	});
	const chartByDate = new Map(chart.map((entry) => [entry.date, entry]));
	for (const transaction of transactions) {
		const entry = chartByDate.get(dateKey(transaction.createdAt));
		if (!entry) continue;
		if (transaction.toAccountId === account.id) entry.received = entry.received.plus(transaction.amount);
		if (transaction.fromAccountId === account.id) entry.sent = entry.sent.plus(transaction.amount);
	}

	const recentTransactions = transactions.slice(0, 5).map((transaction) => {
		const receivedByUser = transaction.toAccountId === account.id;
		const counterparty = receivedByUser ? transaction.fromAccount?.user.fullName : transaction.toAccount?.user.fullName;
		return {
			id: transaction.id,
			reference: transaction.reference,
			type: transaction.type,
			direction: receivedByUser ? "IN" : "OUT",
			counterparty: counterparty ?? (transaction.type === "DEPOSIT" ? "SecureTx opening deposit" : "Account activity"),
			amount: money(transaction.amount),
			signedAmount: `${receivedByUser ? "+" : "-"}${money(transaction.amount)}`,
			status: transaction.status,
			createdAt: transaction.createdAt.toISOString(),
		};
	});

	return {
		balance: money(account.balance),
		accountNumber: account.accountNumber,
		currency: account.currency,
		monthlyStats: { received: money(received), sent: money(sent), transactionCount: monthlyTransactions.length },
		dailyOutgoing: money(dailyOutgoing),
		remainingDailyLimit: money(remainingDailyLimit),
		chartData: chart.map((entry) => ({ date: entry.date, label: entry.label, received: money(entry.received), sent: money(entry.sent) })),
		recentTransactions,
	};
}