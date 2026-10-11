type RateLimitEntry = { count: number; resetAt: number };

const buckets = new Map<string, RateLimitEntry>();

export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function checkRateLimit(ip: string, route: string, limit = 10, windowMs = 60_000): { allowed: boolean; retryAfter: number } {
  const key = `${ip}:${route}`;
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: windowMs };
  }
  existing.count += 1;
  return { allowed: existing.count <= limit, retryAfter: Math.max(1, existing.resetAt - now) };
}