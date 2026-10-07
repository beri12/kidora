import { EmptyState, ErrorState } from '@/components/ui';
import { isEndpointMissing } from '@/hooks/district';
import { useT } from '@/hooks/useT';

/** District APIs are API GAP #3: a 404 shows "coming soon", anything else a real error. */
export function DistrictError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useT();
  if (isEndpointMissing(error)) return <EmptyState emoji="🗺️" title={t('district.unavailable')} body={t('district.unavailableBody')} />;
  return <ErrorState error={error} onRetry={onRetry} />;
}
