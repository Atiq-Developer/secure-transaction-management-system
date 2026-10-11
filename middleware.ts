import { NextResponse, type NextRequest } from "next/server";
import { verifyJwt } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

function redirect(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = path === "/login" ? `?next=${encodeURIComponent(request.nextUrl.pathname)}` : "";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session: Awaited<ReturnType<typeof verifyJwt>> | null = null;
  if (token) {
    try { session = await verifyJwt(token); } catch { session = null; }
  }

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage && session) return redirect(request, session.role === "ADMIN" ? "/admin" : "/dashboard");
  if (!session && (pathname.startsWith("/dashboard") || pathname.startsWith("/transfer") || pathname.startsWith("/transactions") || pathname.startsWith("/settings") || pathname.startsWith("/admin"))) return redirect(request, "/login");
  if (pathname.startsWith("/admin") && session?.role !== "ADMIN") return redirect(request, "/403");
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/transfer/:path*", "/transactions/:path*", "/settings/:path*", "/admin/:path*", "/login", "/register"] };