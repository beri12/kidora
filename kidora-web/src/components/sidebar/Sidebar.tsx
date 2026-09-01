'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

// School/teacher navigation is deliberately plain and task-shaped; the child
// navigation is the playful one. Two visual languages, one component.
const SCHOOL_NAV: NavItem[] = [
  { href: '/dashboard/school/overview', label: 'Overview', icon: '📊' },
  { href: '/dashboard/school/students', label: 'Students', icon: '🎒' },
  { href: '/dashboard/school/teachers', label: 'Teachers', icon: '🍎' },
  { href: '/dashboard/school/classes', label: 'Classes', icon: '🏫' },
  { href: '/dashboard/school/grades', label: 'Grades', icon: '🔢' },
  { href: '/dashboard/school/courses', label: 'Courses', icon: '📚' },
  { href: '/dashboard/school/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/school/settings', label: 'Settings', icon: '⚙️' },
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
    { href: '/dashboard/teacher/assignments', label: 'Assignments', icon: '📝' },
    { href: '/dashboard/teacher/exams', label: 'Exams', icon: '🎯' },
    { href: '/dashboard/teacher/students', label: 'Students', icon: '🎒' },
    { href: '/dashboard/teacher/analytics', label: 'Analytics', icon: '📈' },
    { href: '/dashboard/teacher/upload', label: 'Upload', icon: '⬆️' },
  ],
  PARENT: [
    { href: '/dashboard/parent', label: 'Overview', icon: '📊' },
    { href: '/dashboard/parent/children', label: 'My children', icon: '👪' },
    { href: '/pricing', label: 'Subscription', icon: '💎' },
  ],
  CHILD: [
    { href: '/dashboard/child', label: 'Home', icon: '🏠' },
    { href: '/learn', label: 'Adventure map', icon: '🗺️' },
    { href: '/courses', label: 'Courses', icon: '📚' },
    { href: '/games', label: 'Games', icon: '🎮' },
    { href: '/learn/certificates', label: 'Certificates', icon: '🎓' },
    { href: '/rewards', label: 'Rewards', icon: '🏆' },
  ],
  SCHOOL_ADMIN: SCHOOL_NAV,
  SCHOOL_LEADER: SCHOOL_NAV,
  DISTRICT_ADMIN: [
    { href: '/dashboard/district', label: 'Overview', icon: '📊' },
    { href: '/dashboard/school/overview', label: 'Schools', icon: '🏫' },
    { href: '/dashboard/school/analytics', label: 'Analytics', icon: '📈' },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const path = usePathname();
  const items = NAV[role] ?? [];

  return (
    <aside className="hidden w-60 shrink-0 border-r-2 border-brand-100 bg-white p-4 md:block">
      <div className="mb-2 px-3 font-body-x text-[11px] uppercase text-brand-400">{role.replace('_', ' ')} menu</div>
      <nav aria-label="Sections">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = path === item.href || path.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 font-display text-[15px] font-extrabold',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                    active ? 'bg-brand-100 text-brand-800' : 'text-brand-600 hover:bg-brand-50',
                  )}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
