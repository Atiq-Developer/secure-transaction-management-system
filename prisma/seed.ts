import { Prisma, PrismaClient, Role, TransactionStatus, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateTransactionReference } from "../src/lib/identifiers";

const prisma = new PrismaClient();
const openingBalance = "50000.00";

const customers = [
  { fullName: "Ali Khan", email: "ali@securetx.demo", accountNumber: "1000000001" },
  { fullName: "Sara Ahmed", email: "sara@securetx.demo", accountNumber: "1000000002" },
  { fullName: "Usman Raza", email: "usman@securetx.demo", accountNumber: "1000000003" },
] as const;

const transferPlan = [
  [0, 1, "1250.00", "2026-09-28T09:15:00.000Z"],
  [1, 2, "850.00", "2026-09-29T12:30:00.000Z"],
  [2, 0, "2200.00", "2026-09-30T15:45:00.000Z"],
  [0, 2, "3750.00", "2026-10-01T08:20:00.000Z"],
  [1, 0, "1400.00", "2026-10-02T17:10:00.000Z"],
  [2, 1, "925.00", "2026-10-03T10:05:00.000Z"],
  [0, 1, "3000.00", "2026-10-04T13:40:00.000Z"],
  [1, 2, "1800.00", "2026-10-05T11:25:00.000Z"],
  [2, 0, "1100.00", "2026-10-06T16:55:00.000Z"],
  [0, 2, "2450.00", "2026-10-07T09:50:00.000Z"],
  [1, 0, "675.00", "2026-10-08T14:15:00.000Z"],
  [2, 1, "3200.00", "2026-10-09T18:05:00.000Z"],
  [0, 1, "975.00", "2026-10-10T07:35:00.000Z"],
  [1, 2, "1550.00", "2026-10-10T12:45:00.000Z"],
  [2, 0, "2600.00", "2026-10-11T10:10:00.000Z"],
] as const;

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("Customer@12345", 12);
  const adminPasswordHash = await bcrypt.hash("Admin@12345", 12);

  await prisma.user.upsert({
    where: { email: "admin@securetx.demo" },
    update: { fullName: "SecureTx Administrator", role: Role.ADMIN, status: "ACTIVE", passwordHash: adminPasswordHash },
    create: {
      fullName: "SecureTx Administrator",
      email: "admin@securetx.demo",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const accounts = [];
  for (const customer of customers) {
    const user = await prisma.user.upsert({
      where: { email: customer.email },
      update: { fullName: customer.fullName, passwordHash, role: Role.CUSTOMER, status: "ACTIVE" },
      create: { fullName: customer.fullName, email: customer.email, passwordHash },
    });

    const account = await prisma.account.upsert({
      where: { userId: user.id },
      update: { accountNumber: customer.accountNumber },
      create: { userId: user.id, accountNumber: customer.accountNumber, balance: openingBalance },
    });
    accounts.push({ user, account });

    const idempotencyKey = `seed-opening-${customer.email}`;
    const existingOpening = await prisma.transaction.findUnique({ where: { idempotencyKey } });
    if (!existingOpening) {
      await prisma.transaction.create({
        data: {
          reference: generateTransactionReference(new Date("2026-09-27T08:00:00.000Z")),
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount: openingBalance,
          note: "Demo account opening deposit",
          idempotencyKey,
          toAccountId: account.id,
          balanceAfterTo: openingBalance,
          createdAt: new Date("2026-09-27T08:00:00.000Z"),
        },
      });
    }
  }

  for (const [index, [fromIndex, toIndex, amount, createdAt]] of transferPlan.entries()) {
    const from = accounts[fromIndex];
    const to = accounts[toIndex];
    const idempotencyKey = `seed-transfer-${String(index + 1).padStart(2, "0")}`;
    const existing = await prisma.transaction.findUnique({ where: { idempotencyKey } });
    if (existing) {
      continue;
    }

    const transferAmount = new Prisma.Decimal(amount);
    const fromBalance = from.account.balance.minus(transferAmount);
    const toBalance = to.account.balance.plus(transferAmount);

    await prisma.$transaction(async (transaction) => {
      await transaction.account.update({ where: { id: from.account.id }, data: { balance: fromBalance } });
      await transaction.account.update({ where: { id: to.account.id }, data: { balance: toBalance } });
      await transaction.transaction.create({
        data: {
          reference: generateTransactionReference(new Date(createdAt)),
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          amount,
          note: "Demo transfer",
          idempotencyKey,
          fromAccountId: from.account.id,
          toAccountId: to.account.id,
          balanceAfterFrom: fromBalance,
          balanceAfterTo: toBalance,
          createdAt: new Date(createdAt),
        },
      });
      await transaction.auditLog.create({
        data: {
          userId: from.user.id,
          action: "TRANSFER_SUCCESS",
          ipAddress: "127.0.0.1",
          userAgent: "seed",
          metadata: { idempotencyKey, amount, fromAccount: from.account.accountNumber, toAccount: to.account.accountNumber },
          createdAt: new Date(createdAt),
        },
      });
    });

    from.account.balance = fromBalance;
    to.account.balance = toBalance;
  }

  console.log("Seed complete: 1 admin, 3 customers, 3 accounts, 3 deposits, and 15 transfers.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });