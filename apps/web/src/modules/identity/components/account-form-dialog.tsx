'use client';

import {
  createAccountSchema,
  updateAccountSchema,
  type Account,
  type UpdateAccountInput,
} from '@servico-certo/contracts';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { ApiClient } from '@/shared/lib/api-client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { createAccount, updateAccount } from '../lib/accounts-api';
import { getAccountErrorMessage, isEmailTakenError } from '../lib/account-errors';

type FieldName = 'name' | 'email' | 'password' | 'passwordConfirmation';
type FieldErrors = Partial<Record<FieldName, string>>;

type FormValues = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

const FIELDS: FieldName[] = ['name', 'email', 'password', 'passwordConfirmation'];

function isFieldName(value: unknown): value is FieldName {
  return typeof value === 'string' && FIELDS.includes(value as FieldName);
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (isFieldName(field) && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

type CommonProps = {
  request: ApiClient['fetch'];
  onClose: () => void;
  onSaved: (account: Account) => void;
};

type AccountFormDialogProps =
  | (CommonProps & {
      mode: 'create';
    })
  | (CommonProps & {
      mode: 'edit';
      account: Account;
    });

export function AccountFormDialog(props: AccountFormDialogProps) {
  const isEdit = props.mode === 'edit';
  const account = props.mode === 'edit' ? props.account : null;

  const [values, setValues] = useState<FormValues>(() => ({
    name: account?.name ?? '',
    email: account?.email ?? '',
    password: '',
    passwordConfirmation: '',
  }));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field: FieldName) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      setValues((current) => ({ ...current, [field]: value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setFormError(null);
    };
  }

  function handleApiError(error: unknown) {
    if (isEmailTakenError(error)) {
      setFieldErrors((current) => ({
        ...current,
        email: 'Este e-mail já está em uso neste tenant.',
      }));
      return;
    }

    setFormError(
      getAccountErrorMessage(
        error,
        isEdit ? 'Não foi possível salvar as alterações.' : 'Não foi possível criar o usuário.',
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError(null);
    setFieldErrors({});

    if (props.mode === 'create') {
      const result = createAccountSchema.safeParse({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (!result.success) {
        setFieldErrors(toFieldErrors(result.error.issues));
        return;
      }

      if (values.password !== values.passwordConfirmation) {
        setFieldErrors({ passwordConfirmation: 'As senhas não conferem' });
        return;
      }

      setIsSubmitting(true);

      try {
        const saved = await createAccount(props.request, result.data);
        props.onSaved(saved);
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const changes: UpdateAccountInput = {};
    const name = values.name.trim();
    const email = values.email.trim().toLowerCase();

    if (name !== props.account.name) {
      changes.name = name;
    }

    if (email !== props.account.email) {
      changes.email = email;
    }

    if (Object.keys(changes).length === 0) {
      setFormError('Nenhuma alteração para salvar.');
      return;
    }

    const result = updateAccountSchema.safeParse(changes);

    if (!result.success) {
      setFieldErrors(toFieldErrors(result.error.issues));
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = await updateAccount(props.request, props.account.id, result.data);
      props.onSaved(saved);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open
      onClose={props.onClose}
      title={isEdit ? 'Editar usuário' : 'Novo usuário'}
      description={
        isEdit
          ? 'Atualize o nome ou o e-mail da conta.'
          : 'Crie uma conta de acesso para este tenant.'
      }
      closeDisabled={isSubmitting}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-name" className="text-fog/70">
            Nome
          </Label>
          <Input
            id="account-name"
            name="name"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Maria Silva"
            maxLength={120}
            value={values.name}
            onChange={handleChange('name')}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'account-name-error' : undefined}
            disabled={isSubmitting}
          />
          {fieldErrors.name ? (
            <p id="account-name-error" className="text-sm text-destructive">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="account-email" className="text-fog/70">
            E-mail
          </Label>
          <Input
            id="account-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="maria@exemplo.com"
            maxLength={255}
            value={values.email}
            onChange={handleChange('email')}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'account-email-error' : 'account-email-hint'}
            disabled={isSubmitting}
          />
          {fieldErrors.email ? (
            <p id="account-email-error" className="text-sm text-destructive">
              {fieldErrors.email}
            </p>
          ) : (
            <p id="account-email-hint" className="text-xs text-fog/45">
              O e-mail é usado para entrar na conta.
            </p>
          )}
        </div>

        {!isEdit ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-password" className="text-fog/70">
                Senha inicial
              </Label>
              <Input
                id="account-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={values.password}
                onChange={handleChange('password')}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? 'account-password-error' : 'account-password-hint'
                }
                disabled={isSubmitting}
              />
              {fieldErrors.password ? (
                <p id="account-password-error" className="text-sm text-destructive">
                  {fieldErrors.password}
                </p>
              ) : (
                <p id="account-password-hint" className="text-xs text-fog/45">
                  Mínimo de 10 caracteres.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="account-password-confirmation" className="text-fog/70">
                Confirmar senha
              </Label>
              <Input
                id="account-password-confirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={values.passwordConfirmation}
                onChange={handleChange('passwordConfirmation')}
                aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                aria-describedby={
                  fieldErrors.passwordConfirmation
                    ? 'account-password-confirmation-error'
                    : undefined
                }
                disabled={isSubmitting}
              />
              {fieldErrors.passwordConfirmation ? (
                <p id="account-password-confirmation-error" className="text-sm text-destructive">
                  {fieldErrors.passwordConfirmation}
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {formError ? <Alert variant="destructive">{formError}</Alert> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={props.onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="brand" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
