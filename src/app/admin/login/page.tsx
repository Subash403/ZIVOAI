'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { BRAND_ASSETS } from '@/lib/brand';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(BRAND_ASSETS.horizontalLight);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.logoUrl) setLogoUrl(data.settings.logoUrl);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, adminOnly: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid administrator credentials');
      }

      if (data.user?.role !== 'ADMIN') {
        throw new Error('Access denied: Administrator privileges required.');
      }

      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F9FAFB] px-4 pb-12 pt-12 text-slate-900 sm:px-6 sm:pt-16 lg:pt-20">
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Brand Logo & Header */}
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <BrandLogo variant="horizontal" tone="light" size="xl" src={logoUrl} alt="Zivo AI" />
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0073B0]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Restricted Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Zivo AI Administration
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Authorized management console for marketplace operations and fulfillment.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-8 shadow-xl space-y-5">
          {error && (
            <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-bold text-slate-700 mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zivo.ai"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-[#0089CF] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-[#0089CF] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#ED1C24] hover:bg-[#D1171F] text-white text-sm font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating Administrator...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Sign In to Administration
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Administrative sessions are cryptographically signed and logged. Customer accounts cannot sign in through this console.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
