import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectTarget = searchParams.get('from') || '/account';

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
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
  const state = Buffer.from(JSON.stringify({ from: redirectTarget })).toString('base64');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'online');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('state', state);

  return NextResponse.redirect(googleAuthUrl);
}
