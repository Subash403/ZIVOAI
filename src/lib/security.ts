import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession, type AdminPayload } from '@/lib/auth';
import { getClientIp } from '@/lib/rate-limit';

const SENSITIVE_KEY_PATTERN = /(secret|token|password|signature|authorization|cookie|private[_-]?key|api[_-]?key)/i;

export function redactSensitive<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value
      .replace(/(rzp_(?:live|test)_[A-Za-z0-9]+)/g, 'rzp_***REDACTED***')
      .replace(/(Bearer\s+[A-Za-z0-9._-]+)/gi, 'Bearer ***REDACTED***') as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item)) as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSensitive(v);
      }
    }
    return out as T;
  }
  return value;
}

export function safeErrorResponse(
  error: unknown,
  fallbackMessage: string,
  status = 500,
  context?: string
): NextResponse {
  const safeLogMessage = error instanceof Error ? redactSensitive(error.message) : String(error);
  console.error(`[API Error${context ? `:${context}` : ''}]`, safeLogMessage);
  return NextResponse.json({ error: fallbackMessage }, { status });
}

export async function requireAdminRequest(
  request?: Request
): Promise<{ session: AdminPayload; errorResponse: null } | { session: null; errorResponse: NextResponse }> {
  const session = await getAdminSession(request);
  if (!session || session.role !== 'ADMIN') {
    return {
      session: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 }),
    };
  }
  return { session, errorResponse: null };
}

export interface AuditLogInput {
  actor: { userId: string; email: string };
  action: string;
  resourceType: string;
  resourceId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  request?: Request;
}

export async function recordAdminAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ? JSON.stringify(redactSensitive(input.metadata)) : null,
        ipAddress: input.request ? getClientIp(input.request) : null,
      },
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to persist admin audit log:', err instanceof Error ? err.message : 'unknown');
  }
}

export interface EnvCheckItem {
  key: string;
  category: 'database' | 'auth' | 'payments' | 'storage' | 'email' | 'app' | 'oauth';
  requiredInProd: boolean;
  configured: boolean;
  note?: string;
}

export interface EnvironmentHealthReport {
  nodeEnv: string;
  readyForProduction: boolean;
  missingRequired: string[];
  warnings: string[];
  checks: EnvCheckItem[];
  razorpayMode: 'test' | 'live' | 'unconfigured' | 'invalid';
}

/**
 * Validates presence and structural integrity of required environment variables
 * WITHOUT ever returning or logging secret values.
 */
export function validateEnvironment(): EnvironmentHealthReport {
  const env = process.env;
  const nodeEnv = env.NODE_ENV || 'development';
  const rzpKey = env.RAZORPAY_KEY_ID || '';
  const razorpayMode: EnvironmentHealthReport['razorpayMode'] = !rzpKey
    ? 'unconfigured'
    : rzpKey.startsWith('rzp_live_')
    ? 'live'
    : rzpKey.startsWith('rzp_test_')
    ? 'test'
    : 'invalid';

  const jwtSecret = env.JWT_SECRET || '';
  const jwtStrong =
    jwtSecret.length >= 32 &&
    !jwtSecret.toLowerCase().includes('fallback') &&
    !jwtSecret.toLowerCase().includes('change-in-production');

  const checks: EnvCheckItem[] = [
    { key: 'DATABASE_URL', category: 'database', requiredInProd: true, configured: Boolean(env.DATABASE_URL) },
    { key: 'DIRECT_URL', category: 'database', requiredInProd: true, configured: Boolean(env.DIRECT_URL) },
    {
      key: 'JWT_SECRET',
      category: 'auth',
      requiredInProd: true,
      configured: Boolean(jwtSecret),
      note: jwtSecret && !jwtStrong ? 'Must be >= 32 chars and non-placeholder in production' : undefined,
    },
    { key: 'ADMIN_EMAIL', category: 'auth', requiredInProd: true, configured: Boolean(env.ADMIN_EMAIL) },
    { key: 'ADMIN_PASSWORD', category: 'auth', requiredInProd: true, configured: Boolean(env.ADMIN_PASSWORD) },
    {
      key: 'RAZORPAY_KEY_ID',
      category: 'payments',
      requiredInProd: true,
      configured: razorpayMode === 'test' || razorpayMode === 'live',
      note: `mode=${razorpayMode}`,
    },
    { key: 'RAZORPAY_KEY_SECRET', category: 'payments', requiredInProd: true, configured: Boolean(env.RAZORPAY_KEY_SECRET) },
    { key: 'RAZORPAY_WEBHOOK_SECRET', category: 'payments', requiredInProd: true, configured: Boolean(env.RAZORPAY_WEBHOOK_SECRET) },
    { key: 'R2_ACCOUNT_ID', category: 'storage', requiredInProd: true, configured: Boolean(env.R2_ACCOUNT_ID) },
    { key: 'R2_ACCESS_KEY_ID', category: 'storage', requiredInProd: true, configured: Boolean(env.R2_ACCESS_KEY_ID) },
    { key: 'R2_SECRET_ACCESS_KEY', category: 'storage', requiredInProd: true, configured: Boolean(env.R2_SECRET_ACCESS_KEY) },
    { key: 'R2_BUCKET_PRIVATE', category: 'storage', requiredInProd: true, configured: Boolean(env.R2_BUCKET_PRIVATE) },
    { key: 'R2_BUCKET_PUBLIC', category: 'storage', requiredInProd: true, configured: Boolean(env.R2_BUCKET_PUBLIC) },
    { key: 'SMTP_HOST', category: 'email', requiredInProd: true, configured: Boolean(env.SMTP_HOST) },
    { key: 'SMTP_USER', category: 'email', requiredInProd: true, configured: Boolean(env.SMTP_USER) },
    { key: 'SMTP_PASSWORD', category: 'email', requiredInProd: true, configured: Boolean(env.SMTP_PASSWORD || env.SMTP_PASS) },
    { key: 'SMTP_FROM', category: 'email', requiredInProd: true, configured: Boolean(env.SMTP_FROM) },
    { key: 'NEXT_PUBLIC_APP_URL', category: 'app', requiredInProd: true, configured: Boolean(env.NEXT_PUBLIC_APP_URL) },
    {
      key: 'GOOGLE_OAUTH',
      category: 'oauth',
      requiredInProd: false,
      configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
  ];

  const missingRequired = checks.filter((c) => c.requiredInProd && !c.configured).map((c) => c.key);
  const warnings: string[] = [];

  if (nodeEnv === 'production' && razorpayMode === 'test') {
    warnings.push('RAZORPAY_KEY_ID is using test mode in a production NODE_ENV.');
  }
  if (nodeEnv !== 'production' && razorpayMode === 'live') {
    warnings.push('RAZORPAY_KEY_ID is using LIVE credentials outside production!');
  }
  if (jwtSecret && !jwtStrong) {
    warnings.push('JWT_SECRET does not meet production strength requirements (>= 32 chars).');
  }
  if (!env.SMTP_FROM) {
    warnings.push('SMTP_FROM is unset; configure an authenticated sender aligned with SPF/DKIM/DMARC.');
  }

  return {
    nodeEnv,
    readyForProduction: missingRequired.length === 0 && jwtStrong,
    missingRequired,
    warnings,
    checks,
    razorpayMode,
  };
}
