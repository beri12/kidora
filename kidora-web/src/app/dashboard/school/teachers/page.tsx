'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMySchool, useSchoolTeachers } from '@/features/school/hooks';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';

const STAFF = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN'] as const;

export default function SchoolTeachersPage() {
  useRequireAuth([...STAFF]);
  const [q, setQ] = useState('');
  const teachers = useSchoolTeachers({ q: q || undefined });
  const school = useMySchool();

  if (teachers.isError) return <ErrorState onRetry={() => teachers.refetch()} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">Teachers</h1>
        <p className="font-body font-bold text-brand-600">
          {teachers.data?.total ?? 0} staff members.
          {school.data?.code && ` Share join code ${school.data.code} to add more.`}
        </p>
      </header>

      <div className="rounded-3xl border-2 border-brand-100 bg-white p-4 shadow-card">
        <label htmlFor="teacher-search" className="sr-only">Search teachers</label>
        <Input id="teacher-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" />
      </div>

      <DataTable
        caption="Teachers in your school"
        isLoading={teachers.isLoading}
        rows={teachers.data?.rows ?? []}
        emptyTitle="No teachers found"
        emptyDescription="Share your school join code so teachers can attach their accounts."
        columns={[
          {
            key: 'name', header: 'Teacher',
            cell: (r) => (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-full font-display font-extrabold text-white"
                  style={{ background: r.avatarColor }}
                >
                  {r.name[0]}
                </span>
                <span className="font-display font-extrabold">{r.name}</span>
              </span>
            ),
          },
          { key: 'email', header: 'Email', secondary: true, cell: (r) => r.email },
          { key: 'courses', header: 'Courses', cell: (r) => r._count?.coursesOwned ?? 0 },
          { key: 'classes', header: 'Classes', secondary: true, cell: (r) => r._count?.homeroomClasses ?? 0 },
          {
            key: 'joined', header: 'Joined', secondary: true,
            cell: (r) => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
      />
    </div>
  );
}
