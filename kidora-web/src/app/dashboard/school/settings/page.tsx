'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMySchool } from '@/features/school/hooks';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState, LoadingState } from '@/components/ui/states';

const STAFF = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'ADMIN'] as const;

export default function SchoolSettingsPage() {
  useRequireAuth([...STAFF]);
  const school = useMySchool();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', city: '', country: '', timezone: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (school.data) {
      setForm({
        name: school.data.name ?? '',
        city: school.data.city ?? '',
        country: school.data.country ?? '',
        timezone: school.data.timezone ?? 'UTC',
      });
    }
  }, [school.data]);

  const save = useMutation({
    mutationFn: async () => (await api.patch('/schools/me', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school'] });
      setSaved(true);
    },
  });

  if (school.isLoading) return <LoadingState rows={2} label="Loading settings" />;
  if (school.isError) return <ErrorState onRetry={() => school.refetch()} />;

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">School settings</h1>
        <p className="font-body font-bold text-brand-600">These details appear on your students&rsquo; certificates.</p>
      </header>

      <form
        className="space-y-4 rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          save.mutate();
        }}
      >
        {([
          ['name', 'School name'],
          ['city', 'City'],
          ['country', 'Country'],
          ['timezone', 'Timezone'],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`school-${key}`} className="font-display font-extrabold text-brand-900">{label}</label>
            <Input
              id={`school-${key}`}
              className="mt-1"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}

        <div className="rounded-2xl bg-brand-50 p-4">
          <p className="font-display font-extrabold text-brand-900">Join code</p>
          <p className="mt-1 font-mono text-2xl font-bold text-brand-700">{school.data?.code ?? '—'}</p>
          <p className="mt-1 font-body-x text-[12px] text-brand-400">
            Share this with teachers and families so their accounts attach to this school.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          {saved && <span role="status" className="font-body font-bold text-grass-600">Saved ✓</span>}
          {save.isError && (
            <span role="alert" className="font-body font-bold text-rose-600">
              We could not save those changes.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
