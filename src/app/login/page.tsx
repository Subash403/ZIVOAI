'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { notifyAuthStateChanged } from '@/lib/auth-client';
import BrandLogo from '@/components/BrandLogo';
import { BRAND_ASSETS } from '@/lib/brand';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_oauth_state: 'Google sign-in session expired or did not match. Please try again.',
  cancelled: 'Google sign-in was cancelled.',
  access_denied: 'Google sign-in was cancelled.',
  oauth_configuration_missing:
    'Google OAuth is not configured on this server (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Please sign in with email and password.',
  token_exchange_failed: 'Could not complete Google authentication. Please try again or use email and password.',
  invalid_user_info: 'Your Google account must have a verified email address to sign in.',
  oauth_account_conflict: 'This Google account conflicts with an existing account. Please contact support.',
  oauth_internal_error: 'An unexpected error occurred during Google sign-in. Please try again.',
};

async function syncGuestWishlistToAccount() {
  try {
    const raw = localStorage.getItem('pm_wishlist');
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (Array.isArray(ids) && ids.length > 0) {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: ids }),
      });
    }
  } catch {
    // Non-blocking wishlist merge
  }
}

export function LoginFormContent({ defaultMode }: { defaultMode?: 'login' | 'register' }) {
  const [logoUrl, setLogoUrl] = useState<string>(BRAND_ASSETS.horizontalLight);
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/account';
  const noticeParam = searchParams.get('notice');
  const errorParam = searchParams.get('error');
  const tabParam = searchParams.get('tab');

  const initialMode = defaultMode || (tabParam === 'register' ? 'register' : 'login');
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam
      ? OAUTH_ERROR_MESSAGES[errorParam] || 'Authentication failed. Please try again.'
      : null
  );
  const [success, setSuccess] = useState<string | null>(null);

  // Minimal high-conversion auth fields (ZAI-103: optional profile fields live in /account)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings?.logoUrl) setLogoUrl(data.settings.logoUrl);
      })
      .catch(() => {});

    // ZAI-104: Only display Google OAuth option when actually configured on the server
    fetch('/api/auth/providers', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setGoogleEnabled(Boolean(data?.providers?.google));
      })
      .catch(() => setGoogleEnabled(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      await syncGuestWishlistToAccount();
      notifyAuthStateChanged();
      setSuccess('Signed in successfully! Redirecting...');
      setTimeout(() => {
        if (data.user?.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push(from);
        }
      }, 450);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      await syncGuestWishlistToAccount();
      notifyAuthStateChanged();
      setSuccess('Account created! Redirecting to your destination...');
      setTimeout(() => {
        router.push(from);
      }, 450);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="zivo-page flex min-h-[85vh] items-center justify-center bg-transparent px-4 pt-24 sm:pt-28 pb-16 sm:px-6 lg:px-8">
      <div className="zivo-reveal w-full max-w-md space-y-6">
        <div className="text-center space-y-2.5">
          <Link href="/" className="inline-flex items-center justify-center">
            <BrandLogo variant="horizontal" tone="light" size="lg" src={logoUrl} alt="Zivo AI" />
          </Link>
          <h1 className="zivo-display text-3xl font-extrabold text-[#0A0A0A] tracking-tight">
            {mode === 'login' ? 'Sign In to Zivo AI' : 'Create Your Account'}
          </h1>
          <p className="text-xs text-[#6B7280]">
            {mode === 'login'
              ? 'Access your purchased projects, secure downloads, and custom build milestones.'
              : 'Quick 3-field signup — optional contact or academic details can be added later in your profile.'}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl">
          <div className="zivo-quad-bar zivo-quad-bar-thin" aria-hidden="true">
            <span className="bg-[#0089CF]" />
            <span className="bg-[#ED1C24]" />
            <span className="bg-[#FDB913]" />
            <span className="bg-[#008C44]" />
          </div>
          <div className="space-y-5 p-6 sm:p-8">
          {noticeParam === 'auth_required' && (
            <div className="flex items-start gap-2 rounded-xl border border-[#0089CF]/30 bg-[#F0F9FF] p-3 text-xs text-[#0A0A0A]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#0089CF]" />
              <div>
                <p className="font-bold">Sign in to continue checkout</p>
                <p className="mt-0.5 text-[#4B5563]">
                  Your order and download links will be securely linked to your account.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login' ? 'bg-white text-[#0089CF] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'register' ? 'bg-white text-[#0089CF] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Google OAuth Sign-In + Visual OR Divider */}
          <div className="space-y-4">
            {googleEnabled ? (
              <a
                href={`/api/auth/google?from=${encodeURIComponent(from)}`}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#D1D5DB] bg-white px-4 text-xs font-bold text-[#111827] shadow-xs transition-all hover:border-[#0089CF] hover:bg-[#F9FAFB]"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setGoogleNotice(
                    'Google OAuth is not configured in this environment yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server to enable Google Sign-In, or use email and password below.'
                  )
                }
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#D1D5DB] bg-white px-4 text-xs font-bold text-[#111827] shadow-xs transition-all hover:border-[#0089CF] hover:bg-[#F9FAFB]"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            )}

            {(googleNotice || noticeParam === 'google_not_configured') && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[11px] leading-relaxed text-[#92400E]"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706]" aria-hidden="true" />
                <span>
                  {googleNotice ||
                    'Google Sign-In is unavailable until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured on the server. Please use email and password below.'}
                </span>
              </div>
            )}

            <div className="relative flex items-center justify-center py-0.5">
              <div className="w-full border-t border-[#E5E7EB]" />
              <span className="absolute bg-white px-3 font-heading text-[11px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">
                OR
              </span>
            </div>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-medium text-slate-500 hover:text-[#0089CF] flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="register-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="register-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="register-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="register-password" className="block text-xs font-semibold text-slate-700">
                    Password (min 8 characters)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-medium text-slate-500 hover:text-[#0089CF] flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  <>
                    Create Account &amp; Continue <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#0089CF] animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
