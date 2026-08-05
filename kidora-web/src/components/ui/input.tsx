import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full bg-brand-50 border-2 border-brand-200 rounded-2xl px-4 py-3 font-body font-bold text-brand-900 outline-none transition-colors placeholder:text-brand-400 focus:border-brand-600',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('block font-body-x text-[13px] text-brand-700 mb-1.5', className)} {...props} />;
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-coral-600 font-body-x text-[12px] mt-1">{children}</p>;
}
