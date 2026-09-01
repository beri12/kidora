'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useGrades, useSchoolCourses, useSchoolTeachers } from '@/features/school/hooks';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/states';

const STAFF = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN'] as const;

export default function SchoolCoursesPage() {
  useRequireAuth([...STAFF]);
  const [filters, setFilters] = useState({ q: '', gradeId: '', teacherId: '', status: '' });
  const courses = useSchoolCourses({
    q: filters.q || undefined,
    gradeId: filters.gradeId || undefined,
    teacherId: filters.teacherId || undefined,
    status: filters.status || undefined,
  });
  const grades = useGrades();
  const teachers = useSchoolTeachers({ pageSize: 100 });

  if (courses.isError) return <ErrorState onRetry={() => courses.refetch()} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">Course library</h1>
        <p className="font-body font-bold text-brand-600">Everything your school teaches, in one place.</p>
      </header>

      <div className="grid gap-3 rounded-3xl border-2 border-brand-100 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="c-q" className="sr-only">Search courses</label>
          <Input id="c-q" value={filters.q} placeholder="Search…" onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="c-grade" className="sr-only">Filter by grade</label>
          <Select id="c-grade" value={filters.gradeId} onChange={(e) => setFilters((f) => ({ ...f, gradeId: e.target.value }))}>
            <option value="">All grades</option>
            {(grades.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="c-teacher" className="sr-only">Filter by teacher</label>
          <Select id="c-teacher" value={filters.teacherId} onChange={(e) => setFilters((f) => ({ ...f, teacherId: e.target.value }))}>
            <option value="">All teachers</option>
            {(teachers.data?.rows ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="c-status" className="sr-only">Filter by status</label>
          <Select id="c-status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
        </div>
      </div>

      <DataTable
        caption="Courses in your school"
        isLoading={courses.isLoading}
        rows={courses.data ?? []}
        emptyTitle="No courses match"
        emptyDescription="Adjust the filters, or ask a teacher to publish one."
        columns={[
          { key: 'title', header: 'Course', cell: (r) => <span className="font-display font-extrabold">{r.title}</span> },
          { key: 'subject', header: 'Subject', secondary: true, cell: (r) => r.subject?.name ?? '—' },
          { key: 'grade', header: 'Grade', cell: (r) => r.grade?.name ?? 'Any' },
          { key: 'teacher', header: 'Teacher', secondary: true, cell: (r) => r.teacher?.name ?? '—' },
          { key: 'lessons', header: 'Lessons', cell: (r) => r._count?.lessons ?? 0 },
          { key: 'enrolled', header: 'Enrolled', secondary: true, cell: (r) => r._count?.enrollments ?? 0 },
          {
            key: 'status', header: 'Status',
            cell: (r) => <Badge tone={r.published ? 'grass' : 'sun'}>{r.published ? 'published' : 'draft'}</Badge>,
          },
        ]}
      />
    </div>
  );
}
