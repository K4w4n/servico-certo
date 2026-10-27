import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

type AlertVariant = 'default' | 'success' | 'destructive';

type AlertProps = ComponentProps<'div'> & {
  variant?: AlertVariant;
};

const variantClasses: Record<AlertVariant, string> = {
  default:
    'bg-card text-card-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-fog/70',
  success:
    'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300',
  destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
};

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
