'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { useAppTheme } from '@/shared/ui/app-theme';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  closeDisabled?: boolean;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  closeDisabled = false,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const theme = useAppTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !closeDisabled) {
        event.preventDefault();
        onCloseRef.current();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [closeDisabled, open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', isDark && 'dark')}
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/50 dark:bg-black/70 dark:backdrop-blur-sm"
        onClick={closeDisabled ? undefined : onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl border bg-background p-6 text-foreground shadow-lg outline-none dark:rounded-2xl dark:border-white/10 dark:bg-surface dark:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]',
          className,
        )}
      >
        <div className="flex flex-col gap-1 pr-8">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight dark:text-white">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-sm text-muted-foreground dark:text-fog/60">
              {description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Fechar"
          className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:text-fog/60 dark:hover:bg-white/5 dark:hover:text-brand"
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
