'use client';
import { use } from 'react';
import Link from 'next/link';
import { useAssignment, useSubmitAssignment } from '@/features/assignments/hooks';
import { trackEvent } from '@/features/lms/hooks';
import { AssignmentSubmission } from '@/components/learning/AssignmentSubmission';
import { ErrorState, LoadingState } from '@/components/ui/states';

export default function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, refetch } = useAssignment(id);
  const submit = useSubmitAssignment(id);

  if (isLoading) return <LoadingState rows={3} label="Loading assignment" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <Link
        href={`/learn/course/${data.courseId}`}
        className="font-display font-extrabold text-brand-600 focus:outline-none focus-visible:underline"
      >
        ← {data.course?.title ?? 'Back to the course'}
      </Link>
      <AssignmentSubmission
        assignment={data}
        isSubmitting={submit.isPending}
        onSubmit={async (body) => {
          await submit.mutateAsync(body);
          trackEvent('assignment_submitted', { assignmentId: id }, data.courseId);
        }}
      />
    </div>
  );
}
