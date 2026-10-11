import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditRequest = Pick<Request, "headers">;

export type AuditInput = {
	userId?: string | null;
	action: string;
	request?: AuditRequest;
	ip?: string;
	userAgent?: string;
	metadata?: Prisma.InputJsonValue;
};

export async function logAudit({ userId, action, request, ip, userAgent, metadata }: AuditInput): Promise<void> {
	const forwardedFor = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	await prisma.auditLog.create({
		data: {
			userId: userId ?? null,
			action,
			ipAddress: ip ?? forwardedFor ?? request?.headers.get("x-real-ip") ?? null,
			userAgent: userAgent ?? request?.headers.get("user-agent") ?? null,
			metadata,
		},
	});
}