'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, UserRound, Menu, ShieldCheck } from 'lucide-react';
import { notifyAuthStateChanged } from '@/lib/auth-client';

interface AdminHeaderProps {
  onToggleMobileSidebar?: () => void;
}

export default function AdminHeader({ onToggleMobileSidebar }: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user && data.user.role === 'ADMIN') {
          setAdminUser({ email: data.user.email, name: data.user.name });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error('Logout failed');
      setAdminUser(null);
      notifyAuthStateChanged();
      router.replace('/admin/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Open admin menu"
            className="cursor-pointer rounded-lg border border-[#E5E7EB] p-2 text-[#4B5563] transition-colors hover:bg-[#F9FAFB] hover:text-[#0A0A0A] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1 text-xs font-semibold text-[#008C44]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Admin Session</span> Verified
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#374151]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#0089CF]/30 bg-[#F0F9FF] text-[#0089CF]">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="hidden text-[#0A0A0A] md:inline">
            {adminUser?.email || adminUser?.name || 'Administrator'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs font-bold text-[#374151] transition-colors hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#ED1C24] disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
