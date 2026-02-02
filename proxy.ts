import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function proxy(request: NextRequest) {
  // Only rate limit the ingest API
  if (!request.nextUrl.pathname.startsWith('/api/ingest')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 
             request.headers.get('x-real-ip') ?? 
             'anonymous';
  
  const now = Date.now();
  const record = rateLimit.get(ip);

  // Periodically cleanup (roughly every 100 requests)
  if (Math.random() < 0.01) {
    cleanupOldEntries();
  }

  if (!record || now - record.timestamp > WINDOW_MS) {
    // New window - reset count
    rateLimit.set(ip, { count: 1, timestamp: now });
    return NextResponse.next();
  }

  if (record.count >= MAX_REQUESTS) {
    // Rate limit exceeded
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((record.timestamp + WINDOW_MS - now) / 1000)),
        },
      }
    );
  }

  // Increment count
  record.count++;
  return NextResponse.next();
}

export const config = {
  matcher: '/api/ingest',
};
