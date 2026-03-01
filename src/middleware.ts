import { NextRequest, NextResponse } from "next/server";

// Sliding-window rate limiter: stores timestamps of recent requests per IP
const requestLog = new Map<string, number[]>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const windowMs = 60_000;
  for (const [key, timestamps] of requestLog) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, valid);
    }
  }
}

function getLimit(pathname: string): number {
  if (pathname === "/api/patios/submit") return 5;
  if (pathname === "/api/auth/login" || pathname === "/api/auth/signup") return 10;
  if (pathname.startsWith("/api/auth/")) return 30;
  if (pathname === "/api/patio-photo" || pathname === "/api/patio-busyness")
    return 30;
  return 60;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  cleanup();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const windowMs = 60_000;
  const limit = getLimit(pathname);

  const timestamps = requestLog.get(key) ?? [];
  const windowTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (windowTimestamps.length >= limit) {
    const oldestInWindow = windowTimestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  windowTimestamps.push(now);
  requestLog.set(key, windowTimestamps);

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
