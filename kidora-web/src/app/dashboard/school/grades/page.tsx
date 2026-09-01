'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCreateGrade, useDeleteGrade, useGrades } from '@/features/school/hooks';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';

const STAFF = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN'] as const;

export default function SchoolGradesPage() {
  useRequireAuth([...STAFF]);
  const grades = useGrades();
  const create = useCreateGrade();
  const remove = useDeleteGrade();
  const [draft, setDraft] = useState({ name: '', level: 1 });
  const [error, setError] = useState<string | null>(null);

  if (grades.isError) return <ErrorState onRetry={() => grades.refetch()} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">Grades</h1>
        <p className="font-body font-bold text-brand-600">
          Grade levels drive which courses each student sees.
        </p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-3xl border-2 border-brand-100 bg-white p-4 shadow-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await create.mutateAsync({ name: draft.name.trim(), level: draft.level });
            setDraft({ name: '', level: draft.level + 1 });
          } catch (err: any) {
            setError(err?.response?.data?.message ?? 'That grade could not be created.');
          }
        }}
      >
        <div className="min-w-[180px] flex-1">
          <label htmlFor="grade-name" className="font-display font-extrabold text-brand-900">Grade name</label>
          <Input
            id="grade-name" className="mt-1" value={draft.name} placeholder="Grade 5"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>
        <div className="w-28">
          <label htmlFor="grade-level" className="font-display font-extrabold text-brand-900">Level</label>
          <Input
            id="grade-level" type="number" min={0} className="mt-1" value={draft.level}
            onChange={(e) => setDraft((d) => ({ ...d, level: Number(e.target.value) || 0 }))}
          />
        </div>
        <Button type="submit" disabled={create.isPending || !draft.name.trim()}>
          {create.isPending ? 'Adding…' : 'Add grade'}
        </Button>
      </form>

      {error && <p role="alert" className="font-body font-bold text-rose-600">{error}</p>}

      <DataTable
        caption="Grades"
        isLoading={grades.isLoading}
        rows={grades.data ?? []}
        emptyTitle="No grades yet"
        emptyDescription="Add the grade levels your school teaches."
        columns={[
          { key: 'name', header: 'Grade', cell: (r) => <span className="font-display font-extrabold">{r.name}</span> },
          { key: 'level', header: 'Level', cell: (r) => r.level },
          { key: 'students', header: 'Students', cell: (r) => r._count?.students ?? 0 },
          { key: 'courses', header: 'Courses', secondary: true, cell: (r) => r._count?.courses ?? 0 },
          {
            key: 'scope', header: 'Scope', secondary: true,
            cell: (r) => (r.schoolId ? 'Your school' : 'Shared'),
          },
          {
            key: 'actions', header: '',
            cell: (r) =>
              r.schoolId ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${r.name}"? Students and courses keep working; they just lose the grade link.`)) {
                      remove.mutate(r.id);
                    }
                  }}
                  className="font-body-x text-[12px] text-rose-500 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  delete
                </button>
              ) : (
                <span className="font-body-x text-[12px] text-brand-300">shared</span>
              ),
          },
        ]}
      />
    </div>
  );
}
