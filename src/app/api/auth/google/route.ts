import { NextResponse } from 'next/server';
import crypto from 'crypto';

const GOOGLE_STATE_COOKIE = 'google_oauth_state';

function isSafeRedirectPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const requestedTarget = searchParams.get('from') || '/account';
  const redirectTarget = isSafeRedirectPath(requestedTarget) ? requestedTarget : '/account';

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    // If Google OAuth credentials are not configured in local environment:
    // Offer friendly demo login for development or instructions
    if (process.env.NODE_ENV !== 'production') {
      const demoRedirect = new URL('/login?notice=google_not_configured', request.url);
      return NextResponse.redirect(demoRedirect);
    }
    return NextResponse.json(
      { error: 'Google OAuth is not configured on this server. Please contact administrator.' },
      { status: 503 }
    );
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const state = Buffer.from(
    JSON.stringify({ from: redirectTarget, nonce: crypto.randomBytes(16).toString('hex') })
  ).toString('base64url');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'online');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(googleAuthUrl);
  response.cookies.set({
    name: GOOGLE_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 10 * 60,
  });
  return response;
}
