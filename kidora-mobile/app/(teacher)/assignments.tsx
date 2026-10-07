import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Screen, ScreenHeader } from '@/components/layout';
import { Badge, BottomSheet, Button, ListRow, ProgressBar, Text, useToast } from '@/components/ui';
import { ControlledField } from '@/features/auth/ControlledField';
import { assignmentSchema, type AssignmentForm } from '@/features/auth/schemas';
import { PagedList } from '@/features/dashboard';
import { useCreateAssignment, useTeacherAssignments } from '@/hooks/teacher';
import { useT } from '@/hooks/useT';
import { colors, spacing } from '@/theme';
import { formatDate } from '@/utils/format';
import { View } from 'react-native';

export default function TeacherAssignments() {
  const { t, locale } = useT();
  const toast = useToast();
  const q = useTeacherAssignments();
  const create = useCreateAssignment();
  const [open, setOpen] = useState(false);
  const form = useForm<AssignmentForm>({ resolver: zodResolver(assignmentSchema), defaultValues: { title: '', instructions: '', maxScore: '100' } });

  const submit = form.handleSubmit(async (v) => {
    await create.mutateAsync({ title: v.title, instructions: v.instructions || undefined, maxScore: Number(v.maxScore) });
    toast.show(t('teacher.assignments.created'), 'success');
    form.reset();
    setOpen(false);
  });

  return (
    <Screen scroll={false} testID="teacher-assignments">
      <ScreenHeader title={t('teacher.assignments.title')} right={<Button label={t('teacher.assignments.create')} size="sm" icon="add" onPress={() => setOpen(true)} />} />
      <PagedList
        query={q}
        keyOf={(a) => a.id}
        emptyTitle={t('teacher.assignments.empty')}
        renderItem={(a) => (
          <View style={{ gap: spacing.xs }}>
            <ListRow
              title={a.title}
              subtitle={[a.course, a.dueAt ? t('teacher.assignments.due', { date: formatDate(a.dueAt, locale) }) : t('teacher.assignments.noDue')].filter(Boolean).join(' · ')}
              right={<Badge label={t('teacher.assignments.submitted', { submitted: a.submitted, total: a.total })} tone={a.total && a.submitted >= a.total ? 'success' : 'info'} />}
            />
            {a.total ? <ProgressBar value={a.submitted / a.total} height={4} color={colors.success} /> : null}
          </View>
        )}
      />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('teacher.assignments.create')}>
        <ControlledField control={form.control} name="title" label={t('teacher.assignments.titleField')} />
        <ControlledField control={form.control} name="instructions" label={t('teacher.assignments.instructions')} multiline />
        <ControlledField control={form.control} name="maxScore" label={t('teacher.assignments.maxScore')} keyboardType="number-pad" />
        {create.isError ? <Text color="danger">{t('errors.unknown')}</Text> : null}
        <Button label={t('common.save')} fullWidth loading={create.isPending} onPress={() => void submit()} />
      </BottomSheet>
    </Screen>
  );
}
