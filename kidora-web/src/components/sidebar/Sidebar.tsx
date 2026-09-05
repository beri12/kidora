'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem { href: string; label: string; icon: string }

// SCHOOL_ADMIN and SCHOOL_LEADER see the same menu; shared so they can't drift.
const SCHOOL_NAV: NavItem[] = [
  { href: '/dashboard/school', label: 'Overview', icon: '📊' },
  { href: '/school/teachers', label: 'Teachers', icon: '🍎' },
  { href: '/school/students', label: 'Students', icon: '👥' },
  { href: '/school/classes', label: 'Classes', icon: '🏫' },
  { href: '/school/courses', label: 'Courses', icon: '📚' },
  { href: '/school/analytics', label: 'Analytics', icon: '📈' },
  { href: '/school/billing', label: 'Billing', icon: '💳' },
];

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: '/dashboard/admin', label: 'Overview', icon: '📊' },
    { href: '/students', label: 'Users', icon: '👥' },
    { href: '/courses', label: 'Courses', icon: '📚' },
    { href: '/dashboard/admin/payments', label: 'Payments', icon: '💳' },
  ],
  TEACHER: [
    { href: '/dashboard/teacher', label: 'Overview', icon: '📊' },
    { href: '/dashboard/teacher/courses', label: 'My Courses', icon: '📚' },
    { href: '/students', label: 'Students', icon: '👥' },
    { href: '/dashboard/teacher/upload', label: 'Upload', icon: '⬆️' },
  ],
  PARENT: [
    { href: '/dashboard/parent', label: 'Overview', icon: '📊' },
    { href: '/dashboard/parent/reports', label: 'Reports', icon: '📈' },
    { href: '/pricing', label: 'Subscription', icon: '💎' },
  ],
  CHILD: [
    { href: '/dashboard/child', label: 'Home', icon: '🏠' },
    { href: '/courses', label: 'Courses', icon: '📚' },
    { href: '/games', label: 'Games', icon: '🎮' },
    { href: '/dashboard/child/rewards', label: 'Rewards', icon: '🏆' },
  ],
  // The org roles had no entry, so NAV[role] was undefined and the sidebar
  // threw on .map — on the very dashboard a school or district leader lands
  // on immediately after signing up.
  SCHOOL_ADMIN: SCHOOL_NAV,
  SCHOOL_LEADER: SCHOOL_NAV,
  DISTRICT_ADMIN: [
    { href: '/dashboard/district', label: 'Overview', icon: '📊' },
    { href: '/school/analytics', label: 'Analytics', icon: '📈' },
    { href: '/school/billing', label: 'Billing', icon: '💳' },
  ],
  SUPER_ADMIN: [
    { href: '/dashboard/admin', label: 'Overview', icon: '📊' },
    { href: '/students', label: 'Users', icon: '👥' },
    { href: '/courses', label: 'Courses', icon: '📚' },
    { href: '/dashboard/admin/payments', label: 'Payments', icon: '💳' },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 bg-white border-r-2 border-brand-100 p-4 hidden md:block">
      <div className="font-body-x text-[11px] text-brand-400 uppercase px-3 mb-2">{role} menu</div>
      <nav className="flex flex-col gap-1">
        {(NAV[role] ?? []).map((item) => (
          <Link key={item.href} href={item.href}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl font-display font-extrabold text-[15px]',
              path === item.href ? 'bg-brand-100 text-brand-800' : 'text-brand-600 hover:bg-brand-50')}>
            <span>{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
