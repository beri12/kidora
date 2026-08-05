import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Standard shadcn cn() helper — merge Tailwind classes safely.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function initials(name: string) {
  return name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
}
