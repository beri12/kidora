import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { FlatList } from 'react-native';

import { EmptyState, ErrorState, SkeletonList } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';
import type { PaginatedResponse } from '@/types';

export interface PagedListProps<T> {
  query: UseInfiniteQueryResult<InfiniteData<PaginatedResponse<T>>, Error>;
  renderItem: (item: T) => ReactElement;
  keyOf: (item: T) => string;
  header?: ReactElement;
  emptyTitle?: string;
}

/** Paginated list (TanStack infinite query + FlatList) with loading/error/empty states. */
export function PagedList<T>({ query, renderItem, keyOf, header, emptyTitle }: PagedListProps<T>) {
  const { t } = useT();
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <FlatList
      data={items}
      keyExtractor={keyOf}
      renderItem={({ item }) => renderItem(item)}
      ListHeaderComponent={header}
      ListHeaderComponentStyle={{ gap: spacing.md, marginBottom: spacing.md }}
      ListEmptyComponent={
        query.isLoading ? (
          <SkeletonList rows={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <EmptyState emoji="🔍" title={emptyTitle ?? t('analytics.noData')} />
        )
      }
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()}
      onEndReachedThreshold={0.4}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing['4xl'] }}
      initialNumToRender={12}
      windowSize={7}
      removeClippedSubviews
    />
  );
}
