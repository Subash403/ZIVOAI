import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signAuthToken, CUSTOMER_TOKEN_COOKIE_NAME } from '@/lib/auth';

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
}

interface GoogleUserInfo {
  sub: string;
  name?: string;
  email: string;
  picture?: string;
  email_verified?: boolean;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  let targetUrl = '/account';
  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf-8'));
      if (decoded?.from && typeof decoded.from === 'string' && decoded.from.startsWith('/')) {
        targetUrl = decoded.from;
      }
    } catch {
      // ignore state parse errors
    }
  }

  if (error || !code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error || 'cancelled')}`, request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=oauth_configuration_missing', request.url));
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;

    // 1. Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url));
    }

    // 2. Fetch user profile from Google UserInfo endpoint
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = (await userRes.json()) as GoogleUserInfo;
    if (!userInfo?.email) {
      return NextResponse.redirect(new URL('/login?error=invalid_user_info', request.url));
    }

    const email = userInfo.email.toLowerCase().trim();
    const googleId = userInfo.sub;
    const name = userInfo.name || email.split('@')[0];
    const avatarUrl = userInfo.picture || null;

    // 3. Safe Account Linking
    // Check if user with this email or googleId already exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { googleId }],
      },
    });

    if (user) {
      // Link Google ID and update avatar if not set
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          avatarUrl: user.avatarUrl || avatarUrl,
        },
      });
    } else {
      // Create fresh customer account via Google
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          avatarUrl,
          role: 'CUSTOMER',
        },
      });
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: (user.role as 'ADMIN' | 'CUSTOMER') || 'CUSTOMER',
      name: user.name,
    });

    const response = NextResponse.redirect(new URL(targetUrl, request.url));
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
  } catch (err: unknown) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=oauth_internal_error', request.url));
  }
}
