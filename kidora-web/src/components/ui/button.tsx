import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl font-display font-extrabold transition-transform active:scale-95 disabled:opacity-60 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'text-white bg-gradient-to-br from-brand-600 to-brand-800 shadow-btn hover:-translate-y-0.5',
        grass: 'text-white bg-gradient-to-br from-grass-500 to-grass-700 shadow-btn-g hover:-translate-y-0.5',
        ghost: 'bg-brand-100 text-brand-700 hover:bg-brand-200',
        outline: 'bg-white border-2 border-brand-200 text-brand-800 hover:border-brand-400',
      },
      size: { sm: 'text-sm px-4 py-2', md: 'text-base px-6 py-3', lg: 'text-lg px-8 py-4' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
