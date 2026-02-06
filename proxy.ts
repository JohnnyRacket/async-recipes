import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AB_HOMEPAGE_COOKIE, getBucket } from '@/lib/ab';

// Simple in-memory rate limiter
// Note: For multi-region deployments, use Vercel KV with @upstash/ratelimit
const rateLimit = new Map<string, { count: number; timestamp: number }>();

const WINDOW_MS = 60_000; // 1 minute window
const MAX_REQUESTS = 10; // 10 requests per minute per IP

// Cleanup old entries periodically to prevent memory leaks
function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimit.entries()) {
    if (now - value.timestamp > WINDOW_MS * 2) {
      rateLimit.delete(key);
    }
  }
}

// Paths that should be rate limited (AI endpoints that incur costs)
const rateLimitedPaths = ['/api/ingest', '/api/enhance'];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // A/B test: assign homepage variant and rewrite to /home/[variant]
  if (pathname === '/') {
    let variant = request.cookies.get(AB_HOMEPAGE_COOKIE)?.value;
    let isNew = false;

    if (variant !== 'a' && variant !== 'b') {
      variant = getBucket(['a', 'b']);
      isNew = true;
    }

    const url = request.nextUrl.clone();
    url.pathname = `/home/${variant}`;
    const response = NextResponse.rewrite(url);

    if (isNew) {
      response.cookies.set(AB_HOMEPAGE_COOKIE, variant, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        sameSite: 'lax',
      });
    }

    return response;
  }

  // Only rate limit AI endpoints
  const shouldRateLimit = rateLimitedPaths.some(path =>
    pathname.startsWith(path)
  );

  if (!shouldRateLimit) {
    console.log(`[PROXY] Request to ${pathname} - not rate limited`);
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 
             request.headers.get('x-real-ip') ?? 
             'anonymous';
  
  const now = Date.now();
  const record = rateLimit.get(ip);

  console.log(`[PROXY] Rate-limited request: ${pathname} from IP: ${ip}`);

  // Periodically cleanup (roughly every 100 requests)
  if (Math.random() < 0.01) {
    console.log(`[PROXY] Running cleanup of old rate limit entries`);
    cleanupOldEntries();
  }

  if (!record || now - record.timestamp > WINDOW_MS) {
    // New window - reset count
    rateLimit.set(ip, { count: 1, timestamp: now });
    console.log(`[PROXY] New rate limit window for IP: ${ip} (1/${MAX_REQUESTS} requests)`);
    return NextResponse.next();
  }

  if (record.count >= MAX_REQUESTS) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.timestamp + WINDOW_MS - now) / 1000);
    console.log(`[PROXY] Rate limit exceeded for IP: ${ip} on ${pathname} (${record.count}/${MAX_REQUESTS} requests). Retry after ${retryAfter}s`);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  // Increment count
  record.count++;
  console.log(`[PROXY] Request allowed for IP: ${ip} on ${pathname} (${record.count}/${MAX_REQUESTS} requests)`);
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/api/ingest', '/api/enhance'],
};
