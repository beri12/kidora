'use client';
import { useMyCertificates } from '@/features/certificates/hooks';
import { CertificateCard } from '@/components/shared/CertificateCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

export default function CertificatesPage() {
  const { data, isLoading, isError, refetch } = useMyCertificates();

  if (isLoading) return <LoadingState rows={2} label="Loading certificates" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold">Your awards 🎓</h1>
      {(data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="🎓"
          title="No certificates yet"
          description="Finish every lesson in an adventure, pass its quizzes and beat the final challenge to earn one."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data!.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </div>
      )}
    </div>
  );
}
