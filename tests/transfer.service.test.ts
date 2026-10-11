import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

type FakeAccount = { id: string; accountNumber: string; userId: string; balance: Prisma.Decimal; user: { id: string; status: "ACTIVE" | "FROZEN" } };
type FakeTransaction = { id: string; reference: string; amount: Prisma.Decimal; note: string | null; balanceAfterFrom: Prisma.Decimal | null; balanceAfterTo: Prisma.Decimal | null; createdAt: Date; status: "COMPLETED" | "FAILED"; idempotencyKey: string; fromAccountId: string; toAccountId: string };
type QueryArgs = { where?: Record<string, string>; data?: Record<string, unknown> };
type FakeDatabase = {
  account: { findUnique: (args: QueryArgs) => Promise<FakeAccount | null>; findUniqueOrThrow: (args: QueryArgs) => Promise<FakeAccount>; update: (args: QueryArgs) => Promise<FakeAccount> };
  transaction: { findUnique: (args: QueryArgs) => Promise<FakeTransaction | null>; findMany: (args: { where: { fromAccountId: string; createdAt: { gte: Date; lt: Date } } }) => Promise<Array<{ amount: Prisma.Decimal }>>; create: (args: { data: Record<string, unknown> }) => Promise<FakeTransaction> };
  $queryRaw: () => Promise<unknown[]>;
  $transaction: <T>(callback: (database: FakeDatabase) => Promise<T>) => Promise<T>;
};

type TestState = { accounts: FakeAccount[]; transactions: FakeTransaction[]; nextId: number; lockTail: Promise<void> };

const { database, state } = vi.hoisted(() => {
  const testState: TestState = { accounts: [], transactions: [], nextId: 1, lockTail: Promise.resolve() };
  const fakeDatabase = {} as FakeDatabase;
  fakeDatabase.account = {
    findUnique: async (args) => {
      const where = args.where ?? {};
      const account = where.userId ? testState.accounts.find((item) => item.userId === where.userId) : testState.accounts.find((item) => item.accountNumber === where.accountNumber || item.id === where.id);
      return account ?? null;
    },
    findUniqueOrThrow: async (args) => {
      const account = await fakeDatabase.account.findUnique(args);
      if (!account) throw new Error("Account not found");
      return account;
    },
    update: async (args) => {
      const account = await fakeDatabase.account.findUnique(args);
      if (!account) throw new Error("Account not found");
      const balance = args.data?.balance;
      if (balance instanceof Prisma.Decimal) account.balance = balance;
      return account;
    },
  };
  fakeDatabase.transaction = {
    findUnique: async (args) => testState.transactions.find((item) => item.idempotencyKey === args.where?.idempotencyKey) ?? null,
    findMany: async (args) => testState.transactions.filter((item) => item.fromAccountId === args.where.fromAccountId && item.createdAt >= args.where.createdAt.gte && item.createdAt < args.where.createdAt.lt && item.status === "COMPLETED").map((item) => ({ amount: item.amount })),
    create: async (args) => {
      const data = args.data;
      const transaction: FakeTransaction = {
        id: `tx-${testState.nextId++}`,
        reference: String(data.reference),
        amount: data.amount as Prisma.Decimal,
        note: (data.note as string | null) ?? null,
        balanceAfterFrom: (data.balanceAfterFrom as Prisma.Decimal | null) ?? null,
        balanceAfterTo: (data.balanceAfterTo as Prisma.Decimal | null) ?? null,
        createdAt: new Date(),
        status: "COMPLETED",
        idempotencyKey: String(data.idempotencyKey),
        fromAccountId: String(data.fromAccountId),
        toAccountId: String(data.toAccountId),
      };
      if (testState.transactions.some((item) => item.idempotencyKey === transaction.idempotencyKey)) {
        throw new Error("duplicate idempotency key");
      }
      testState.transactions.push(transaction);
      return transaction;
    },
  };
  fakeDatabase.$queryRaw = async () => [];
  fakeDatabase.$transaction = async <T>(callback: (database: FakeDatabase) => Promise<T>) => {
    let release: () => void = () => undefined;
    const previous = testState.lockTail;
    testState.lockTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await callback(fakeDatabase); } finally { release(); }
  };
  return { database: fakeDatabase, state: testState };
});

vi.mock("@/lib/prisma", () => ({ prisma: database }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => undefined) }));

import { AppError, transferFunds } from "@/services/transfer.service";

const senderId = "user-sender";
const senderAccount = "1111111111";
const recipientAccount = "2222222222";

function resetState(balance = "5000.00") {
  state.accounts = [
    { id: "account-sender", accountNumber: senderAccount, userId: senderId, balance: new Prisma.Decimal(balance), user: { id: senderId, status: "ACTIVE" } },
    { id: "account-recipient", accountNumber: recipientAccount, userId: "user-recipient", balance: new Prisma.Decimal("1000.00"), user: { id: "user-recipient", status: "ACTIVE" } },
  ];
  state.transactions = [];
  state.nextId = 1;
  state.lockTail = Promise.resolve();
}

function input(overrides: Partial<Parameters<typeof transferFunds>[0]> = {}) {
  return { fromUserId: senderId, toAccountNumber: recipientAccount, amount: "100.00", idempotencyKey: crypto.randomUUID(), ...overrides };
}

beforeEach(() => resetState());

describe("transferFunds", () => {
  it("moves money and records the resulting balances", async () => {
    const result = await transferFunds(input());
    expect(result.status).toBe("COMPLETED");
    expect(result.amount).toBe("100.00");
    expect(state.accounts[0].balance.toFixed(2)).toBe("4900.00");
    expect(state.accounts[1].balance.toFixed(2)).toBe("1100.00");
    expect(state.transactions).toHaveLength(1);
  });

  it("rejects insufficient funds", async () => {
    await expect(transferFunds(input({ amount: "5000.01" }))).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
  });

  it("rejects self transfers", async () => {
    await expect(transferFunds(input({ toAccountNumber: senderAccount }))).rejects.toMatchObject({ code: "SELF_TRANSFER" });
  });

  it("rejects amounts over the per-transaction limit", async () => {
    resetState("150000.00");
    await expect(transferFunds(input({ amount: "100000.01" }))).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });

  it("rejects transfers over the daily limit", async () => {
    resetState("200000.00");
    state.transactions.push({ id: "daily-1", reference: "TX-DAILY", amount: new Prisma.Decimal("199500.00"), note: null, balanceAfterFrom: null, balanceAfterTo: null, createdAt: new Date(), status: "COMPLETED", idempotencyKey: crypto.randomUUID(), fromAccountId: "account-sender", toAccountId: "account-recipient" });
    await expect(transferFunds(input({ amount: "501.00" }))).rejects.toMatchObject({ code: "DAILY_LIMIT_EXCEEDED" });
  });

  it("returns the original transaction for a duplicate idempotency key", async () => {
    const request = input({ idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    const first = await transferFunds(request);
    const second = await transferFunds(request);
    expect(second).toEqual(first);
    expect(state.transactions).toHaveLength(1);
    expect(state.accounts[0].balance.toFixed(2)).toBe("4900.00");
  });

  it("allows only one of two concurrent transfers that exceed the balance", async () => {
    resetState("100.00");
    const request = { toAccountNumber: recipientAccount, amount: "100.00" as const };
    const results = await Promise.allSettled([transferFunds(input({ ...request, idempotencyKey: crypto.randomUUID() })), transferFunds(input({ ...request, idempotencyKey: crypto.randomUUID() }))]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect((rejected?.reason as AppError).code).toBe("INSUFFICIENT_FUNDS");
    expect(state.accounts[0].balance.toFixed(2)).toBe("0.00");
  });
});
