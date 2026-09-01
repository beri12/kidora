'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useGrades, useSchoolStudents, useSetStudentGrade } from '@/features/school/hooks';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';

const STAFF = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN'] as const;

export default function SchoolStudentsPage() {
  useRequireAuth([...STAFF]);
  const [q, setQ] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [page, setPage] = useState(1);

  // Filtering happens on the server, so a large roster is never shipped whole.
  const students = useSchoolStudents({ q: q || undefined, gradeId: gradeId || undefined, page });
  const grades = useGrades();
  const setGrade = useSetStudentGrade();

  if (students.isError) return <ErrorState onRetry={() => students.refetch()} />;

  const total = students.data?.total ?? 0;
  const pageSize = students.data?.pageSize ?? 25;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">Students</h1>
        <p className="font-body font-bold text-brand-600">{total} learners in your school.</p>
      </header>

      <div className="flex flex-wrap gap-3 rounded-3xl border-2 border-brand-100 bg-white p-4 shadow-card">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="student-search" className="sr-only">Search students</label>
          <Input
            id="student-search" value={q} placeholder="Search by name…"
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label htmlFor="student-grade" className="sr-only">Filter by grade</label>
          <Select id="student-grade" value={gradeId} onChange={(e) => { setGradeId(e.target.value); setPage(1); }}>
            <option value="">All grades</option>
            {(grades.data ?? []).map((grade) => (
              <option key={grade.id} value={grade.id}>{grade.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        caption="Students in your school"
        isLoading={students.isLoading}
        rows={students.data?.rows ?? []}
        emptyTitle="No students found"
        emptyDescription="Try a different search, or invite students with your school join code."
        columns={[
          {
            key: 'name', header: 'Student',
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
          {
            key: 'grade', header: 'Grade',
            cell: (r) => (
              <>
                <label className="sr-only" htmlFor={`grade-${r.id}`}>Grade for {r.name}</label>
                <Select
                  id={`grade-${r.id}`}
                  className="w-auto py-1.5 text-sm"
                  value={r.gradeId ?? ''}
                  onChange={(e) => setGrade.mutate({ studentId: r.id, gradeId: e.target.value || undefined })}
                >
                  <option value="">Unassigned</option>
                  {(grades.data ?? []).map((grade) => (
                    <option key={grade.id} value={grade.id}>{grade.name}</option>
                  ))}
                </Select>
              </>
            ),
          },
          { key: 'points', header: 'XP', secondary: true, cell: (r) => r.points },
          { key: 'streak', header: 'Streak', secondary: true, cell: (r) => `${r.streak} days` },
          {
            key: 'certs', header: 'Certificates', secondary: true,
            cell: (r) => r._count?.certificates ?? 0,
          },
        ]}
      />

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </Button>
          <span className="font-body font-bold text-brand-600">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </Button>
        </nav>
      )}
    </div>
  );
}
