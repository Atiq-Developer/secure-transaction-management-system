import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "securetx_session";

const cookieOptions = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "lax" as const,
	path: "/",
};

export async function setSessionCookie(token: string): Promise<void> {
	(await cookies()).set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: 60 * 60 });
}

export async function clearSessionCookie(): Promise<void> {
	(await cookies()).set(SESSION_COOKIE, "", { ...cookieOptions, expires: new Date(0), maxAge: 0 });
}

export async function getCurrentUser(): Promise<User | null> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return null;

	try {
		const payload = await verifyJwt(token);
		const user = await prisma.user.findUnique({ where: { id: payload.userId } });
		if (!user || user.status === "FROZEN") return null;
		return user;
	} catch {
		return null;
	}
}

export async function requireUser(): Promise<User> {
	const user = await getCurrentUser();
	if (!user) throw new Error("Unauthorized");
	return user;
}

export async function requireAdmin(): Promise<User> {
	const user = await requireUser();
	if (user.role !== "ADMIN") throw new Error("Forbidden");
	return user;
}