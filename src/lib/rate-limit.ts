import { NextResponse } from 'next/server';

interface RateLimitBucket {
  timestamps: number[];
  blockedUntil?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  cooldownMs?: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

const MAX_BUCKETS = 10_000;
const store = new Map<string, RateLimitBucket>();

function pruneStore(now: number) {
  if (store.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of store.entries()) {
    const latest = bucket.timestamps[bucket.timestamps.length - 1] ?? 0;
    if ((!bucket.blockedUntil || bucket.blockedUntil <= now) && now - latest > 60 * 60 * 1000) {
      store.delete(key);
    }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  return 'unknown';
}

export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  pruneStore(now);

  const key = `${config.keyPrefix}:${identifier}`;
  const bucket = store.get(key) ?? { timestamps: [] };

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000));
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  const windowStart = now - config.windowMs;
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  if (bucket.timestamps.length >= config.maxRequests) {
    const oldest = bucket.timestamps[0] ?? now;
    const resetMs = Math.max(config.cooldownMs ?? 0, oldest + config.windowMs - now);
    if (config.cooldownMs) {
      bucket.blockedUntil = now + config.cooldownMs;
    }
    store.set(key, bucket);
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(resetMs / 1000)),
    };
  }

  bucket.timestamps.push(now);
  bucket.blockedUntil = undefined;
  store.set(key, bucket);

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function rateLimitExceededResponse(
  result: RateLimitResult,
  message = 'Too many requests. Please wait before trying again.'
): NextResponse {
  return NextResponse.json(
    { error: message, retryAfterSeconds: result.retryAfterSeconds },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    }
  );
}

export function resetRateLimitStore(): void {
  store.clear();
}
