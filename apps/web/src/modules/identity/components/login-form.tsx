'use client';

import { loginSchema } from '@servico-certo/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { ApiError } from '@/shared/lib/api-client';
import { useAuth } from '../providers/auth-provider';

const FIELDS = ['tenantDomain', 'email', 'password'] as const;

type FieldName = (typeof FIELDS)[number];
type FieldErrors = Partial<Record<FieldName, string>>;

type FormValues = {
  tenantDomain: string;
  email: string;
  password: string;
};

const INITIAL_VALUES: FormValues = {
  tenantDomain: '',
  email: '',
  password: '',
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
    if (error.code === 'INVALID_CREDENTIALS') {
      return 'Domínio, e-mail ou senha inválidos.';
    }

    if (error.code === 'VALIDATION_ERROR') {
      return 'Verifique os dados informados e tente novamente.';
    }

    if (error.status === 0) {
      return 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.';
    }
  }

  return 'Não foi possível entrar. Tente novamente.';
}

export function LoginForm() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [router, status]);

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

    const result = loginSchema.safeParse(values);

    if (!result.success) {
      setFieldErrors(toFieldErrors(result.error.issues));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login(result.data);
      router.replace('/');
    } catch (error) {
      setFormError(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'loading') {
    return <p className="py-6 text-center text-sm text-muted-foreground">Carregando sessão…</p>;
  }

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="tenantDomain">Domínio</Label>
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
          aria-describedby={fieldErrors.tenantDomain ? 'tenantDomain-error' : undefined}
          disabled={isSubmitting}
        />
        {fieldErrors.tenantDomain ? (
          <p id="tenantDomain-error" className="text-sm text-destructive">
            {fieldErrors.tenantDomain}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Identificador do seu negócio, como aparece no cadastro.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
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
        />
        {fieldErrors.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          onChange={handleChange('password')}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          disabled={isSubmitting}
        />
        {fieldErrors.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      {formError ? <Alert variant="destructive">{formError}</Alert> : null}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
