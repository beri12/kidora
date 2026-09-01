'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  useAddClassStudents,
  useClassRoster,
  useClasses,
  useCreateClass,
  useGrades,
  useSchoolStudents,
  useSchoolTeachers,
} from '@/features/school/hooks';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import type { SchoolClass } from '@/types';

const STAFF = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN'] as const;

export default function SchoolClassesPage() {
  useRequireAuth([...STAFF]);
  const classes = useClasses();
  const grades = useGrades();
  const teachers = useSchoolTeachers({ pageSize: 100 });
  const create = useCreateClass();

  const [creating, setCreating] = useState(false);
  const [roster, setRoster] = useState<SchoolClass | null>(null);
  const [draft, setDraft] = useState({ name: '', gradeId: '', homeroomTeacherId: '' });

  if (classes.isError) return <ErrorState onRetry={() => classes.refetch()} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">Classes</h1>
          <p className="font-body font-bold text-brand-600">Group students and assign a homeroom teacher.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ New class</Button>
      </header>

      <DataTable
        caption="Classes in your school"
        isLoading={classes.isLoading}
        rows={classes.data ?? []}
        emptyTitle="No classes yet"
        emptyDescription="Create a class, then add students to it."
        onRowClick={(row) => setRoster(row)}
        columns={[
          { key: 'name', header: 'Class', cell: (r) => <span className="font-display font-extrabold">{r.name}</span> },
          { key: 'grade', header: 'Grade', cell: (r) => r.grade?.name ?? '—' },
          { key: 'teacher', header: 'Homeroom', secondary: true, cell: (r) => r.homeroomTeacher?.name ?? 'Unassigned' },
          { key: 'students', header: 'Students', cell: (r) => r._count?.students ?? 0 },
          { key: 'year', header: 'Year', secondary: true, cell: (r) => r.academicYear ?? '—' },
        ]}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New class"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button
              disabled={create.isPending || !draft.name.trim()}
              onClick={async () => {
                await create.mutateAsync({
                  name: draft.name.trim(),
                  gradeId: draft.gradeId || undefined,
                  homeroomTeacherId: draft.homeroomTeacherId || undefined,
                });
                setCreating(false);
                setDraft({ name: '', gradeId: '', homeroomTeacherId: '' });
              }}
            >
              {create.isPending ? 'Creating…' : 'Create class'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="class-name" className="font-display font-extrabold text-brand-900">Class name</label>
            <Input
              id="class-name" className="mt-1" value={draft.name} placeholder="Grade 5 — Sunflower"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="class-grade" className="font-display font-extrabold text-brand-900">Grade</label>
            <Select
              id="class-grade" className="mt-1" value={draft.gradeId}
              onChange={(e) => setDraft((d) => ({ ...d, gradeId: e.target.value }))}
            >
              <option value="">No grade</option>
              {(grades.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="class-teacher" className="font-display font-extrabold text-brand-900">Homeroom teacher</label>
            <Select
              id="class-teacher" className="mt-1" value={draft.homeroomTeacherId}
              onChange={(e) => setDraft((d) => ({ ...d, homeroomTeacherId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {(teachers.data?.rows ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
        </div>
      </Modal>

      {roster && <RosterPanel schoolClass={roster} onClose={() => setRoster(null)} />}
    </div>
  );
}

function RosterPanel({ schoolClass, onClose }: { schoolClass: SchoolClass; onClose: () => void }) {
  const roster = useClassRoster(schoolClass.id);
  const students = useSchoolStudents({ pageSize: 100 });
  const add = useAddClassStudents(schoolClass.id);
  const [picked, setPicked] = useState<string[]>([]);

  const inClass = new Set((roster.data ?? []).map((r) => r.student.id));
  const available = (students.data?.rows ?? []).filter((s) => !inClass.has(s.id));

  return (
    <Modal open onClose={onClose} title={`Roster — ${schoolClass.name}`} className="max-w-2xl">
      {roster.isLoading ? (
        <LoadingState rows={2} label="Loading roster" />
      ) : (
        <>
          <h3 className="font-display font-extrabold text-brand-900">In this class</h3>
          {(roster.data?.length ?? 0) === 0 ? (
            <EmptyState icon="👥" title="No students yet" description="Add some from the list below." />
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {roster.data!.map((row) => (
                <li
                  key={row.id}
                  className="rounded-2xl bg-brand-50 px-3 py-2 font-display font-extrabold text-brand-800"
                >
                  {row.student.name}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-6 font-display font-extrabold text-brand-900">Add students</h3>
          {available.length === 0 ? (
            <p className="mt-2 font-body font-bold text-brand-400">Every student in your school is already in a class here.</p>
          ) : (
            <>
              <fieldset className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-2xl border-2 border-brand-100 p-3">
                <legend className="sr-only">Students available to add</legend>
                {available.map((student) => (
                  <label key={student.id} className="flex items-center gap-2 font-body font-bold text-brand-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-600"
                      checked={picked.includes(student.id)}
                      onChange={(e) =>
                        setPicked((p) => (e.target.checked ? [...p, student.id] : p.filter((id) => id !== student.id)))
                      }
                    />
                    {student.name}
                    {student.grade?.name && (
                      <span className="font-body-x text-[11px] text-brand-400">· {student.grade.name}</span>
                    )}
                  </label>
                ))}
              </fieldset>
              <Button
                className="mt-3"
                disabled={picked.length === 0 || add.isPending}
                onClick={async () => {
                  await add.mutateAsync(picked);
                  setPicked([]);
                }}
              >
                {add.isPending ? 'Adding…' : `Add ${picked.length} ${picked.length === 1 ? 'student' : 'students'}`}
              </Button>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
