'use client';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Navbar } from '@/components/navbar/Navbar';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="flex max-w-[1240px] mx-auto">
        <Sidebar role={user.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
