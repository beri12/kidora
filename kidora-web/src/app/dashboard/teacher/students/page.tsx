'use client';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useStudents } from '@/features/teachers/hooks';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/shared/ProgressBar';

const TONE: Record<string, 'grass' | 'sun' | 'coral'> = {
  Ahead: 'grass',
  'On track': 'sun',
  'Needs support': 'coral',
};

export default function TeacherStudentsPage() {
  useRequireAuth(['TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_LEADER']);
  const { data, isLoading } = useStudents();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">My students</h1>
        <p className="font-body font-bold text-brand-600">
          Learners enrolled in your courses or in a class you run.
        </p>
      </header>

      <DataTable
        caption="Students in your classes"
        isLoading={isLoading}
        rows={(data ?? []) as any}
        emptyTitle="No students yet"
        emptyDescription="Students appear here once they are enrolled in one of your courses or added to your class."
        columns={[
          {
            key: 'name',
            header: 'Student',
            cell: (r: any) => (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-full font-display font-extrabold text-white"
                  style={{ background: r.avatarColor ?? '#8B5CF6' }}
                >
                  {r.initial}
                </span>
                <span className="font-display font-extrabold">{r.name}</span>
              </span>
            ),
          },
          { key: 'grade', header: 'Grade', secondary: true, cell: (r: any) => r.grade ?? '—' },
          {
            key: 'progress',
            header: 'Progress',
            className: 'w-[200px]',
            cell: (r: any) => <ProgressBar value={r.progress} label={`${r.name} progress`} />,
          },
          { key: 'status', header: 'Status', cell: (r: any) => <Badge tone={TONE[r.status] ?? 'brand'}>{r.status}</Badge> },
        ]}
      />
    </div>
  );
}
