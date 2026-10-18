import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ADMIN_TOKEN_COOKIE_NAME,
  CUSTOMER_TOKEN_COOKIE_NAME,
  verifyAdminToken,
  verifyAuthToken,
} from './lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect Admin Dashboard Routes
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get(ADMIN_TOKEN_COOKIE_NAME)?.value;
    const session = token ? verifyAdminToken(token) : null;

    if (!session || session.role !== 'ADMIN') {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const response = NextResponse.redirect(loginUrl);
      if (token && !session) {
        response.cookies.delete(ADMIN_TOKEN_COOKIE_NAME);
      }
      return response;
    }
  }

  // Protect Customer Account Dashboard & Checkout Routes
  if (pathname.startsWith('/account') || pathname.startsWith('/checkout')) {
    const customerToken = request.cookies.get(CUSTOMER_TOKEN_COOKIE_NAME)?.value;
    const adminToken = request.cookies.get(ADMIN_TOKEN_COOKIE_NAME)?.value;
    const token = customerToken || adminToken;
    const session = token ? verifyAuthToken(token) : null;

    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      if (pathname.startsWith('/checkout')) {
        loginUrl.searchParams.set('notice', 'auth_required');
      }
      const response = NextResponse.redirect(loginUrl);
      if (customerToken) {
        response.cookies.delete(CUSTOMER_TOKEN_COOKIE_NAME);
      }
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/checkout/:path*'],
};
