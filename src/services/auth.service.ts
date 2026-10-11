import { Prisma, Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateAccountNumber, generateTransactionReference } from "@/lib/identifiers";
import { prisma } from "@/lib/prisma";

const passwordSchema = z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
export const registerSchema = z.object({ fullName: z.string().trim().min(2).max(60), email: z.string().trim().email(), password: passwordSchema });
export const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema });

export class AuthServiceError extends Error {
	constructor(public readonly message: string, public readonly status = 401, public readonly userId?: string, public readonly locked = false) {
		super(message);
		this.name = "AuthServiceError";
	}
}

export type PublicUser = { id: string; fullName: string; email: string; role: Role; status: UserStatus };

function publicUser(user: { id: string; fullName: string; email: string; role: Role; status: UserStatus }): PublicUser {
	return { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status };
}

async function uniqueAccountNumber(transaction: Prisma.TransactionClient): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const accountNumber = generateAccountNumber();
		if (!(await transaction.account.findUnique({ where: { accountNumber } }))) return accountNumber;
	}
	throw new Error("Could not allocate an account number");
}

export async function register(input: unknown): Promise<PublicUser> {
	const parsed = registerSchema.parse(input);
	const email = parsed.email.toLowerCase();
	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) throw new AuthServiceError("An account with this email already exists", 409);

	const passwordHash = await bcrypt.hash(parsed.password, 12);
	const user = await prisma.$transaction(async (transaction) => {
		const createdUser = await transaction.user.create({ data: { fullName: parsed.fullName, email, passwordHash } });
		const account = await transaction.account.create({ data: { userId: createdUser.id, accountNumber: await uniqueAccountNumber(transaction), balance: "50000.00" } });
		await transaction.transaction.create({
			data: {
				reference: generateTransactionReference(), type: "DEPOSIT", status: "COMPLETED", amount: "50000.00",
				note: "Opening account deposit", idempotencyKey: `opening-${createdUser.id}`, toAccountId: account.id,
				balanceAfterTo: "50000.00",
			},
		});
		return createdUser;
	});

	return publicUser(user);
}

export async function login(input: unknown): Promise<{ user: PublicUser; token: string }> {
	const parsed = loginSchema.parse(input);
	const email = parsed.email.toLowerCase();
	const user = await prisma.user.findUnique({ where: { email } });
	const genericError = "Invalid email or password";

	if (!user) throw new AuthServiceError(genericError);
	if (user.status === "FROZEN") throw new AuthServiceError(genericError, 401, user.id);
	if (user.lockedUntil && user.lockedUntil > new Date()) throw new AuthServiceError(genericError, 401, user.id, true);

	const passwordMatches = await bcrypt.compare(parsed.password, user.passwordHash);
	if (!passwordMatches) {
		const nextFailedCount = user.failedLoginCount + 1;
		const locked = nextFailedCount >= 5;
		await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: nextFailedCount, lockedUntil: locked ? new Date(Date.now() + 15 * 60 * 1000) : null } });
		throw new AuthServiceError(genericError, 401, user.id, locked);
	}

	const updatedUser = await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
	const { signJwt } = await import("@/lib/auth");
	return { user: publicUser(updatedUser), token: await signJwt({ userId: updatedUser.id, role: updatedUser.role }) };
}

export async function changePassword(userId: string, input: unknown): Promise<void> {
	const parsed = changePasswordSchema.parse(input);
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user || user.status === "FROZEN") throw new AuthServiceError("Unable to change password", 401, userId);
	if (!(await bcrypt.compare(parsed.currentPassword, user.passwordHash))) throw new AuthServiceError("Current password is incorrect", 400, userId);
	await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(parsed.newPassword, 12) } });
}