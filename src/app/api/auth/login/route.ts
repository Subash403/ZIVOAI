import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  comparePassword,
  hashPassword,
  signAuthToken,
  ADMIN_TOKEN_COOKIE_NAME,
  CUSTOMER_TOKEN_COOKIE_NAME,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    const envAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const envAdminPassword = process.env.ADMIN_PASSWORD;
    const isEnvAdminAttempt =
      Boolean(envAdminEmail &&
      envAdminPassword &&
      trimmedEmail === envAdminEmail &&
      password === envAdminPassword);

    // If user does not exist yet, but matches .env ADMIN_EMAIL and ADMIN_PASSWORD, create it automatically
    if (!user && isEnvAdminAttempt) {
      const hashedPassword = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: trimmedEmail,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.role === 'ADMIN') {
      if (process.env.NODE_ENV === 'production' && password === 'adminpassword123') {
        return NextResponse.json(
          { error: 'Default demo password cannot be used in production. Please set a secure ADMIN_PASSWORD.' },
          { status: 403 }
        );
      }
    }

    if (!user.password) {
      return NextResponse.json(
        { error: 'This account was created with Google. Please use Continue with Google.' },
        { status: 400 }
      );
    }

    let isPasswordValid = await comparePassword(password, user.password);

    // If password in DB was out of sync with .env, auto-update the DB hash and allow login
    if (!isPasswordValid && isEnvAdminAttempt && user.role === 'ADMIN') {
      const updatedHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: updatedHash },
      });
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const userRole = (user.role as 'ADMIN' | 'CUSTOMER') || 'CUSTOMER';
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: userRole,
      name: user.name,
    });

    const cookieName = userRole === 'ADMIN' ? ADMIN_TOKEN_COOKIE_NAME : CUSTOMER_TOKEN_COOKIE_NAME;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });

    if (userRole === 'ADMIN') {
      response.cookies.delete(CUSTOMER_TOKEN_COOKIE_NAME);
    } else {
      response.cookies.delete(ADMIN_TOKEN_COOKIE_NAME);
    }

    response.cookies.set({
      name: cookieName,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
