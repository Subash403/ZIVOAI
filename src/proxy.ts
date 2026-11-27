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
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get(ADMIN_TOKEN_COOKIE_NAME)?.value;
    const adminSession = adminToken ? verifyAdminToken(adminToken) : null;
    const customerToken = request.cookies.get(CUSTOMER_TOKEN_COOKIE_NAME)?.value;
    const customerSession = customerToken ? verifyAuthToken(customerToken) : null;

    // Handle /admin/login specifically
    if (pathname === '/admin/login') {
      // Authenticated administrators are redirected straight to /admin
      if (adminSession && adminSession.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      // Authenticated customers without admin role are redirected away from admin login
      if (customerSession && customerSession.role === 'CUSTOMER') {
        const accountUrl = new URL('/account', request.url);
        accountUrl.searchParams.set('notice', 'admin_access_restricted');
        return NextResponse.redirect(accountUrl);
      }
      return NextResponse.next();
    }

    // For all other /admin routes (/admin, /admin/projects, /admin/orders, etc.):
    if (!adminSession || adminSession.role !== 'ADMIN') {
      // Authenticated customers without admin role are redirected away to their account
      if (customerSession && customerSession.role === 'CUSTOMER') {
        const accountUrl = new URL('/account', request.url);
        accountUrl.searchParams.set('notice', 'admin_access_restricted');
        return NextResponse.redirect(accountUrl);
      }
      // Unauthenticated visitors are redirected to /admin/login
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const response = NextResponse.redirect(loginUrl);
      if (adminToken && !adminSession) {
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
