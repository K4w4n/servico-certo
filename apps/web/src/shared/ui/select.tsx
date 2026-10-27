import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'dark:border-white/10 dark:bg-white/[0.04] dark:text-white',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'dark:focus-visible:border-brand/60 dark:focus-visible:ring-brand/25',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
