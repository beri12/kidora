import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-2xl border-2 border-brand-100 bg-white px-4 py-3 font-body text-brand-900',
        'placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
