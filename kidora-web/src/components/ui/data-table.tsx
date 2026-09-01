'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EmptyState, LoadingState } from './states';

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. Falls back to the row's same-named property. */
  cell?: (row: T) => ReactNode;
  className?: string;
  /** Hidden below md, for columns that are nice-to-have on a phone. */
  secondary?: boolean;
}

/**
 * The staff-side table. Semantic <table> markup with a real caption and scoped
 * headers, wrapped in its own horizontal scroller so the page body never
 * scrolls sideways on a phone.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  caption,
  isLoading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  caption: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}) {
  if (isLoading) return <LoadingState label={`Loading ${caption}`} />;
  if (!rows?.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="overflow-x-auto rounded-3xl border-2 border-brand-100 bg-white shadow-card">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b-2 border-brand-100">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'px-4 py-3 font-body-x text-[11px] uppercase tracking-wide text-brand-400',
                  c.secondary && 'hidden md:table-cell',
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              className={cn(
                'border-b border-brand-50 last:border-0',
                onRowClick &&
                  'cursor-pointer hover:bg-brand-50 focus:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-400',
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-4 py-3 font-body font-bold text-sm text-brand-800',
                    c.secondary && 'hidden md:table-cell',
                    c.className,
                  )}
                >
                  {c.cell ? c.cell(row) : String((row as any)[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
