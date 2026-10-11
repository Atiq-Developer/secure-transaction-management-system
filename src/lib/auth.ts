import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";
import { getEnv } from "@/lib/env";

export type SessionPayload = {
	userId: string;
	role: Role;
};

type VerifiedSessionPayload = JWTPayload & SessionPayload;

function getJwtSecret(): Uint8Array {
	return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function signJwt(payload: SessionPayload): Promise<string> {
	return new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt()
		.setExpirationTime("1h")
		.sign(getJwtSecret());
}

export async function verifyJwt(token: string): Promise<VerifiedSessionPayload> {
	const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
	if (typeof payload.userId !== "string" || (payload.role !== "CUSTOMER" && payload.role !== "ADMIN")) {
		throw new Error("Invalid session payload");
	}

	return payload as VerifiedSessionPayload;
}