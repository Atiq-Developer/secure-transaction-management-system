import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { setUserStatus } from "@/services/admin.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ status: z.enum(["ACTIVE", "FROZEN"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const { status } = bodySchema.parse(await request.json());
    const result = await setUserStatus(admin.id, id, status, request);
    return NextResponse.json({ success: true, data: { user: result } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Status must be ACTIVE or FROZEN" } }, { status: 400 });
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
    if (error instanceof Error && error.message === "ADMIN_TARGET_FORBIDDEN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admins cannot freeze themselves or another admin" } }, { status: 403 });
    const forbidden = error instanceof Error && error.message === "Forbidden";
    return NextResponse.json({ success: false, error: { code: forbidden ? "FORBIDDEN" : "UNAUTHORIZED", message: forbidden ? "Admin access required" : "Authentication required" } }, { status: forbidden ? 403 : 401 });
  }
}