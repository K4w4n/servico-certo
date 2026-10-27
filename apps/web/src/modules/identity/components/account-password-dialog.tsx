'use client';

import { passwordSchema, type Account } from '@servico-certo/contracts';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, type ApiClient } from '@/shared/lib/api-client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { updateAccount } from '../lib/accounts-api';
import { getAccountErrorMessage } from '../lib/account-errors';

type AccountPasswordDialogProps = {
  account: Account;
  isSelf: boolean;
  request: ApiClient['fetch'];
  onClose: () => void;
  onChanged: (account: Account) => void;
};

export function AccountPasswordDialog({
  account,
  isSelf,
  request,
  onClose,
  onChanged,
}: AccountPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    passwordConfirmation?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);
    setFieldErrors((current) => ({ ...current, password: undefined }));
    setFormError(null);
  }

  function handleConfirmationChange(event: ChangeEvent<HTMLInputElement>) {
    setPasswordConfirmation(event.target.value);
    setFieldErrors((current) => ({ ...current, passwordConfirmation: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError(null);

    const result = passwordSchema.safeParse(password);

    if (!result.success) {
      setFieldErrors({
        password: result.error.issues[0]?.message ?? 'Informe uma senha válida',
      });
      return;
    }

    if (password !== passwordConfirmation) {
      setFieldErrors({ passwordConfirmation: 'As senhas não conferem' });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const updated = await updateAccount(request, account.id, { password: result.data });
      onChanged(updated);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'WEAK_PASSWORD') {
        setFieldErrors({ password: 'A senha deve ter entre 10 e 128 caracteres' });
      } else {
        setFormError(getAccountErrorMessage(error, 'Não foi possível alterar a senha.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Alterar senha"
      description={`Defina uma nova senha para ${account.name}.`}
      closeDisabled={isSubmitting}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {isSelf ? (
          <Alert>
            Sua sessão atual continuará ativa por alguns minutos. Depois, entre novamente com a nova
            senha.
          </Alert>
        ) : (
          <Alert>
            As sessões deste usuário serão encerradas. Ele precisará entrar novamente com a nova
            senha.
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-fog/70">
            Nova senha
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            placeholder="••••••••"
            value={password}
            onChange={handlePasswordChange}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
            disabled={isSubmitting}
          />
          {fieldErrors.password ? (
            <p id="password-error" className="text-sm text-destructive">
              {fieldErrors.password}
            </p>
          ) : (
            <p id="password-hint" className="text-xs text-fog/45">
              Mínimo de 10 caracteres.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="passwordConfirmation" className="text-fog/70">
            Confirmar nova senha
          </Label>
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={passwordConfirmation}
            onChange={handleConfirmationChange}
            aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
            aria-describedby={
              fieldErrors.passwordConfirmation ? 'passwordConfirmation-error' : undefined
            }
            disabled={isSubmitting}
          />
          {fieldErrors.passwordConfirmation ? (
            <p id="passwordConfirmation-error" className="text-sm text-destructive">
              {fieldErrors.passwordConfirmation}
            </p>
          ) : null}
        </div>

        {formError ? <Alert variant="destructive">{formError}</Alert> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="brand" disabled={isSubmitting}>
            {isSubmitting ? 'Alterando…' : 'Alterar senha'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
