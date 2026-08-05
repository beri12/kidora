import * as React from 'react';
import { cn } from '@/lib/utils';

const TONES: Record<string, string> = {
  brand: 'bg-brand-100 text-brand-700',
  grass: 'bg-grass-100 text-grass-600',
  sun: 'bg-amber-100 text-amber-700',
  coral: 'bg-rose-100 text-rose-600',
  sky: 'bg-sky-100 text-sky-600',
};

export function Badge({ tone = 'brand', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof TONES }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 font-body-x text-[11px]', TONES[tone], className)} {...props} />;
}
