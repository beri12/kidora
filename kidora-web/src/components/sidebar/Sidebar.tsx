'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem { href: string; label: string; icon: string }

// These point at the LMS tree (/student, /teacher, /parent, /school) — the one
// wired to the backend. They used to point at /dashboard/*, so a user who
// signed in landed on the new dashboard and was then walked straight back to
// the old pages by the first sidebar link they clicked.
// /dashboard/teacher/upload is the exception: the course-upload wizard only
// exists there.

// SCHOOL_ADMIN and SCHOOL_LEADER see the same menu; shared so they can't drift.
const SCHOOL_NAV: NavItem[] = [
  { href: '/school/dashboard', label: 'Overview', icon: '📊' },
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
    { href: '/teacher/dashboard', label: 'Overview', icon: '📊' },
    { href: '/teacher/courses', label: 'My Courses', icon: '📚' },
    { href: '/teacher/students', label: 'Students', icon: '👥' },
    { href: '/teacher/assignments', label: 'Assignments', icon: '📝' },
    { href: '/dashboard/teacher/upload', label: 'Upload', icon: '⬆️' },
  ],
  PARENT: [
    { href: '/parent/dashboard', label: 'Overview', icon: '📊' },
    { href: '/parent/progress', label: 'Progress', icon: '📈' },
    { href: '/parent/assignments', label: 'Assignments', icon: '📝' },
    { href: '/pricing', label: 'Subscription', icon: '💎' },
  ],
  CHILD: [
    { href: '/student/dashboard', label: 'Home', icon: '🏠' },
    { href: '/student/courses', label: 'Courses', icon: '📚' },
    { href: '/games', label: 'Games', icon: '🎮' },
    { href: '/student/badges', label: 'Rewards', icon: '🏆' },
  ],
  // The org roles had no entry, so NAV[role] was undefined and the sidebar
  // threw on .map — on the very dashboard a school or district leader lands
  // on immediately after signing up.
  SCHOOL_ADMIN: SCHOOL_NAV,
  SCHOOL_LEADER: SCHOOL_NAV,
  DISTRICT_ADMIN: [
    { href: '/school/dashboard', label: 'Overview', icon: '📊' },
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
