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
  const [logoUrl, setLogoUrl] = useState('/images/zivoai-logo.png');
  const [googleEnabled, setGoogleEnabled] = useState(false);
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
    errorParam ? 'Authentication failed. Please try again.' : null
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
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Zivo AI Logo"
              className="h-12 w-auto object-contain mix-blend-multiply sm:h-14"
            />
          </Link>
          <h1 className="zivo-display text-3xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'login' ? 'Sign In to Zivo AI' : 'Create Your Account'}
          </h1>
          <p className="text-xs text-slate-500">
            {mode === 'login'
              ? 'Access your purchased projects, secure downloads, and custom build milestones.'
              : 'Quick 3-field signup — optional contact or academic details can be added later in your profile.'}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-5">
          {noticeParam === 'auth_required' && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sign in to continue checkout</p>
                <p className="text-slate-600 mt-0.5">
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
                mode === 'login' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                mode === 'register' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Conditional Google OAuth Button (ZAI-104) */}
          {googleEnabled && (
            <div className="space-y-4">
              <a
                href={`/api/auth/google?from=${encodeURIComponent(from)}`}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google
              </a>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
                  or with email
                </span>
              </div>
            </div>
          )}

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
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1"
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
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    placeholder="Alex Rivera"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1"
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
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
