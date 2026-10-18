import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  signAuthToken,
  CUSTOMER_TOKEN_COOKIE_NAME,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, phone, college, department, year } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    const hashedPassword = await hashPassword(password);

    if (existingUser) {
      // If user signed up via Google earlier without a password, link password
      if (!existingUser.password) {
        const updated = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            password: hashedPassword,
            name: trimmedName || existingUser.name,
            phone: phone ? String(phone).trim() : existingUser.phone,
            college: college ? String(college).trim() : existingUser.college,
            department: department ? String(department).trim() : existingUser.department,
            year: year ? String(year).trim() : existingUser.year,
          },
        });

        const token = signAuthToken({
          userId: updated.id,
          email: updated.email,
          role: (updated.role as 'ADMIN' | 'CUSTOMER') || 'CUSTOMER',
          name: updated.name,
        });

        const response = NextResponse.json({
          success: true,
          message: 'Account linked successfully with password.',
          user: {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role,
          },
        });

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
      }

      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      );
    }

    // Create fresh customer account
    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
        role: 'CUSTOMER',
        phone: phone ? String(phone).trim() : null,
        college: college ? String(college).trim() : null,
        department: department ? String(department).trim() : null,
        year: year ? String(year).trim() : null,
      },
    });

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: 'CUSTOMER',
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

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
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
