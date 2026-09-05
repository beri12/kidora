"use client";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { Skeleton, EmptyState } from "./States";

export interface Column<T> { key: string; header: string; render: (row: T) => ReactNode; className?: string; hideOnMobile?: boolean; }

export function DataTable<T extends { id: string }>({ columns, rows, loading, page, pageSize, total, onPage, empty, mobileCard, onRowClick }: {
  columns: Column<T>[]; rows: T[]; loading?: boolean; page: number; pageSize: number; total: number; onPage: (p: number) => void;
  empty: { title: string; body?: string }; mobileCard?: (row: T) => ReactNode; onRowClick?: (row: T) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (loading && !rows.length) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!rows.length) return <EmptyState title={empty.title} body={empty.body} />;
  return (
    <div>
      {/* Mobile: cards */}
      {mobileCard && <ul className="space-y-2 md:hidden">{rows.map((r) => <li key={r.id} onClick={() => onRowClick?.(r)}>{mobileCard(r)}</li>)}</ul>}
      {/* Desktop: table */}
      <div className={cn("overflow-x-auto", mobileCard && "hidden md:block")}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              {columns.map((c) => <th key={c.key} scope="col" className={cn("pb-2 pr-4 font-medium", c.className, c.hideOnMobile && "hidden lg:table-cell")}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} onClick={() => onRowClick?.(r)} className={cn(onRowClick && "cursor-pointer hover:bg-brand-50/40")}>
                {columns.map((c) => <td key={c.key} className={cn("py-3 pr-4 align-middle", c.className, c.hideOnMobile && "hidden lg:table-cell")}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-xs text-muted" aria-label="Pagination">
          <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex items-center gap-1">
            <button type="button" className="btn-icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span className="px-2">Page {page} of {pages}</span>
            <button type="button" className="btn-icon" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        </nav>
      )}
    </div>
  );
}
