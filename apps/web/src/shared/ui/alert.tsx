import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

type AlertVariant = 'default' | 'destructive';

type AlertProps = ComponentProps<'div'> & {
  variant?: AlertVariant;
};

const variantClasses: Record<AlertVariant, string> = {
  default: 'bg-card text-card-foreground',
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
