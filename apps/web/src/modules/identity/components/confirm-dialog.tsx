'use client';

import type { ReactNode } from 'react';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';

type ConfirmDialogProps = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmVariant?: 'default' | 'destructive';
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmVariant = 'default',
  isLoading,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open onClose={onClose} title={title} closeDisabled={isLoading}>
      <div className="flex flex-col gap-5">
        <div className="text-sm text-muted-foreground">{description}</div>

        {error ? <Alert variant="destructive">{error}</Alert> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Aguarde…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
