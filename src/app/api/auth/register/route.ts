import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  signAuthToken,
  ADMIN_TOKEN_COOKIE_NAME,
  CUSTOMER_TOKEN_COOKIE_NAME,
} from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(clientIp, {
      keyPrefix: 'auth:register',
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
      cooldownMs: 5 * 60 * 1000,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl, 'Too many registration attempts. Please try again shortly.');
    }

    const body = await request.json();
    const { name, email, password, phone, college, department, year } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).toLowerCase().trim();

    if (!trimmedName || trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Please enter a valid name.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 120) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true, googleId: true },
    });

    // Security: NEVER overwrite or attach a password to an existing account (prevents OAuth account takeover).
    if (existingUser) {
      return NextResponse.json(
        {
          error: existingUser.googleId
            ? 'An account with this email already exists via Google sign-in. Please sign in with Google.'
            : 'An account with this email already exists. Please sign in instead.',
        },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
        role: 'CUSTOMER',
        emailVerified: false,
        tokenVersion: 0,
        phone: phone ? String(phone).trim().slice(0, 30) : null,
        college: college ? String(college).trim().slice(0, 120) : null,
        department: department ? String(department).trim().slice(0, 120) : null,
        year: year ? String(year).trim().slice(0, 60) : null,
      },
    });

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: 'CUSTOMER',
      name: user.name,
      tokenVersion: user.tokenVersion,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      },
      { status: 201 }
    );

    response.cookies.delete(ADMIN_TOKEN_COOKIE_NAME);
    response.cookies.set({
      name: CUSTOMER_TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: unknown) {
    console.error('Registration error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
