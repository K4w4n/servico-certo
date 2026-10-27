'use client';

import { requestPasswordResetSchema } from '@servico-certo/contracts';
import { Building2, Loader2, Mail, MailCheck } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError } from '@/shared/lib/api-client';
import { cn } from '@/shared/lib/cn';
import { Alert } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { requestPasswordReset } from '../lib/auth-api';
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS } from './auth-form-styles';

const FIELDS = ['tenantDomain', 'email'] as const;

type FieldName = (typeof FIELDS)[number];
type FieldErrors = Partial<Record<FieldName, string>>;

type FormValues = {
  tenantDomain: string;
  email: string;
};

const INITIAL_VALUES: FormValues = {
  tenantDomain: '',
  email: '',
};

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

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Muitas solicitações. Aguarde alguns minutos e tente novamente.';
    }

    if (error.status === 0) {
      return 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.';
    }

    if (error.code === 'VALIDATION_ERROR') {
      return 'Verifique os dados informados e tente novamente.';
    }
  }

  return 'Não foi possível solicitar a redefinição. Tente novamente.';
}

export function ForgotPasswordForm() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(field: FieldName) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      setValues((current) => ({ ...current, [field]: value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setFormError(null);
    };
  }

  function handleDomainBlur() {
    setValues((current) => ({
      ...current,
      tenantDomain: current.tenantDomain.trim().toLowerCase(),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError(null);

    const result = requestPasswordResetSchema.safeParse(values);

    if (!result.success) {
      setFieldErrors(toFieldErrors(result.error.issues));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await requestPasswordReset(result.data);
      setSubmitted(true);
    } catch (error) {
      setFormError(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand">
          <MailCheck className="size-6" strokeWidth={1.6} />
        </span>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-white">Verifique seu e-mail</h2>
          <p className="text-sm leading-relaxed text-fog/70">
            Se os dados estiverem corretos, enviaremos um link de redefinição para o e-mail
            informado. O link tem prazo de validade e uso único.
          </p>
          <p className="text-sm leading-relaxed text-fog/70">
            Não encontrou? Confira a caixa de spam ou solicite novamente em alguns minutos.
          </p>
        </div>

        <a
          href="/login"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'w-full border-white/15 bg-transparent text-white hover:border-brand/40 hover:bg-white/5 hover:text-brand',
          )}
        >
          Voltar para o login
        </a>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="tenantDomain" className={AUTH_LABEL_CLASS}>
          Domínio
        </Label>
        <div className="relative">
          <Building2
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fog/40"
            strokeWidth={1.7}
          />
          <Input
            id="tenantDomain"
            name="tenantDomain"
            type="text"
            autoComplete="organization"
            autoCapitalize="none"
            autoFocus
            spellCheck={false}
            placeholder="minha-oficina"
            value={values.tenantDomain}
            onChange={handleChange('tenantDomain')}
            onBlur={handleDomainBlur}
            aria-invalid={Boolean(fieldErrors.tenantDomain)}
            aria-describedby={fieldErrors.tenantDomain ? 'tenantDomain-error' : 'tenantDomain-hint'}
            disabled={isSubmitting}
            className={AUTH_INPUT_CLASS}
          />
        </div>
        {fieldErrors.tenantDomain ? (
          <p id="tenantDomain-error" className="text-sm text-destructive">
            {fieldErrors.tenantDomain}
          </p>
        ) : (
          <p id="tenantDomain-hint" className="text-xs text-fog/45">
            O identificador do seu negócio, como você usa para entrar.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className={AUTH_LABEL_CLASS}>
          E-mail
        </Label>
        <div className="relative">
          <Mail
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fog/40"
            strokeWidth={1.7}
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="voce@exemplo.com"
            value={values.email}
            onChange={handleChange('email')}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            disabled={isSubmitting}
            className={AUTH_INPUT_CLASS}
          />
        </div>
        {fieldErrors.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      {formError ? <Alert variant="destructive">{formError}</Alert> : null}

      <Button
        type="submit"
        variant="brand"
        size="xl"
        className="mt-1 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" />
            Enviando…
          </>
        ) : (
          'Enviar link de redefinição'
        )}
      </Button>
    </form>
  );
}
