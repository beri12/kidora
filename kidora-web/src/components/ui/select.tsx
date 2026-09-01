import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-2xl border-2 border-brand-100 bg-white px-4 py-2.5 font-body font-bold text-brand-900',
        'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
