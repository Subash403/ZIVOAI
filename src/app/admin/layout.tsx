'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If on login route, render children full screen without sidebar/header
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <AdminSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-grow flex flex-col min-w-0">
        <AdminHeader onToggleMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8 flex-grow overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

