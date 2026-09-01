'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Accessible dialog: labelled, focus moved in on open, Escape closes, and the
 * backdrop click closes. Focus returns to whatever opened it.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-brand-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'w-full max-w-lg rounded-3xl border-2 border-brand-100 bg-white shadow-card outline-none',
          'motion-safe:animate-modal-pop max-h-[90vh] overflow-y-auto',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-brand-100 px-6 py-4">
          <h2 className="font-display font-extrabold text-xl text-brand-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full px-2 py-1 text-brand-400 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-brand-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
