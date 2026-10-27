import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const ADMIN_TOKEN_COOKIE_NAME = 'admin_session_token';
export const CUSTOMER_TOKEN_COOKIE_NAME = 'customer_session_token';
export const TOKEN_COOKIE_NAME = ADMIN_TOKEN_COOKIE_NAME;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in production.');
    }
    return 'dev-secret-key-for-local-testing-only-32-chars-minimum';
  }
  if (
    process.env.NODE_ENV === 'production' &&
    (secret.length < 32 ||
      secret.toLowerCase().includes('fallback') ||
      secret.toLowerCase().includes('change-in-production'))
  ) {
    throw new Error(
      'CRITICAL SECURITY ERROR: Insecure or too-short JWT_SECRET in production. Minimum 32 characters required.'
    );
  }
  return secret;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  name?: string;
}

export type AdminPayload = AuthPayload;

export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
}

export function signAdminToken(payload: { userId: string; email: string; role: string }): string {
  return signAuthToken({
    userId: payload.userId,
    email: payload.email,
    role: (payload.role as 'ADMIN' | 'CUSTOMER') || 'ADMIN',
  });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  const payload = verifyAuthToken(token);
  if (payload && payload.role === 'ADMIN') {
    return payload;
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getAdminSession(request?: Request): Promise<AdminPayload | null> {
  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`${ADMIN_TOKEN_COOKIE_NAME}=([^;]+)`));
    if (match?.[1]) {
      return verifyAdminToken(match[1]);
    }
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      return verifyAdminToken(authHeader.slice(7));
    }
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}

export async function getCustomerSession(request?: Request): Promise<AuthPayload | null> {
  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const customerMatch = cookieHeader.match(new RegExp(`${CUSTOMER_TOKEN_COOKIE_NAME}=([^;]+)`));
    if (customerMatch?.[1]) {
      const payload = verifyAuthToken(customerMatch[1]);
      if (payload) return payload;
    }
    const adminMatch = cookieHeader.match(new RegExp(`${ADMIN_TOKEN_COOKIE_NAME}=([^;]+)`));
    if (adminMatch?.[1]) {
      return verifyAuthToken(adminMatch[1]);
    }
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      return verifyAuthToken(authHeader.slice(7));
    }
  }

  try {
    const cookieStore = await cookies();
    const customerToken = cookieStore.get(CUSTOMER_TOKEN_COOKIE_NAME)?.value;
    if (customerToken) {
      const payload = verifyAuthToken(customerToken);
      if (payload) return payload;
    }
    const adminToken = cookieStore.get(ADMIN_TOKEN_COOKIE_NAME)?.value;
    if (adminToken) {
      return verifyAuthToken(adminToken);
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAuthSession(request?: Request): Promise<AuthPayload | null> {
  return getCustomerSession(request);
}


export function setSessionCookie(response: NextResponse, payload: AuthPayload): void {
  const token = signAuthToken(payload);
  const cookieName = payload.role === 'ADMIN' ? ADMIN_TOKEN_COOKIE_NAME : CUSTOMER_TOKEN_COOKIE_NAME;
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set({
    name: cookieName,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie(response: NextResponse, role: 'ADMIN' | 'CUSTOMER' | 'ALL' = 'ALL'): void {
  const cookieOptions = {
    value: '',
    expires: new Date(0),
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  if (role === 'ADMIN' || role === 'ALL') {
    response.cookies.set({ name: ADMIN_TOKEN_COOKIE_NAME, ...cookieOptions });
  }
  if (role === 'CUSTOMER' || role === 'ALL') {
    response.cookies.set({ name: CUSTOMER_TOKEN_COOKIE_NAME, ...cookieOptions });
  }
}

export function createReceiptToken(orderId: string): string {
  const secret = getJwtSecret();
  return crypto.createHmac('sha256', secret).update(`receipt:${orderId}`).digest('hex');
}

export function verifyReceiptToken(orderId: string, token: string): boolean {
  if (!orderId || !token) return false;
  try {
    const expected = createReceiptToken(orderId);
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const tokenBuffer = Buffer.from(token, 'utf8');
    if (expectedBuffer.length !== tokenBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, tokenBuffer);
  } catch {
    return false;
  }
}
