'use client';

import { registerTenantSchema } from '@servico-certo/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError } from '@/shared/lib/api-client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useAuth } from '../providers/auth-provider';

const FIELDS = [
  'tenantName',
  'domain',
  'accountName',
  'email',
  'password',
  'passwordConfirmation',
] as const;

type FieldName = (typeof FIELDS)[number];
type FieldErrors = Partial<Record<FieldName, string>>;

type FormValues = {
  tenantName: string;
  domain: string;
  accountName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

const INITIAL_VALUES: FormValues = {
  tenantName: '',
  domain: '',
  accountName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
};

const FIELD_BY_PATH: Record<string, FieldName> = {
  'tenant.name': 'tenantName',
  'tenant.domain': 'domain',
  'account.name': 'accountName',
  'account.email': 'email',
  'account.password': 'password',
};

function isFieldName(value: unknown): value is FieldName {
  return typeof value === 'string' && FIELDS.includes(value as FieldName);
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of issues) {
    const field = FIELD_BY_PATH[issue.path.map(String).join('.')];

    if (isFieldName(field) && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR') {
      return 'Verifique os dados informados e tente novamente.';
    }

    if (error.status === 0) {
      return 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.';
    }
  }

  return 'Não foi possível criar a conta. Tente novamente.';
}

export function RegisterForm() {
  const { register, status } = useAuth();
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
      domain: current.domain.trim().toLowerCase(),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError(null);

    const result = registerTenantSchema.safeParse({
      tenant: {
        name: values.tenantName,
        domain: values.domain,
      },
      account: {
        name: values.accountName,
        email: values.email,
        password: values.password,
      },
    });

    if (!result.success) {
      const errors = toFieldErrors(result.error.issues);

      if (!values.accountName.trim()) {
        errors.accountName = 'Informe seu nome';
      }

      setFieldErrors(errors);
      return;
    }

    if (values.password !== values.passwordConfirmation) {
      setFieldErrors({ passwordConfirmation: 'As senhas não conferem' });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await register(result.data);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'TENANT_DOMAIN_TAKEN') {
        setFieldErrors({ domain: 'Este domínio já está em uso.' });
      } else if (error instanceof ApiError && error.code === 'EMAIL_TAKEN') {
        setFieldErrors({ email: 'Este e-mail já está em uso.' });
      } else {
        setFormError(toErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'loading') {
    return <p className="py-6 text-center text-sm text-muted-foreground">Carregando sessão…</p>;
  }

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold">Seu negócio</legend>

        <div className="flex flex-col gap-2">
          <Label htmlFor="tenantName">Nome do negócio</Label>
          <Input
            id="tenantName"
            name="tenantName"
            type="text"
            autoComplete="organization"
            autoFocus
            placeholder="Oficina do João"
            value={values.tenantName}
            onChange={handleChange('tenantName')}
            aria-invalid={Boolean(fieldErrors.tenantName)}
            aria-describedby={fieldErrors.tenantName ? 'tenantName-error' : undefined}
            disabled={isSubmitting}
          />
          {fieldErrors.tenantName ? (
            <p id="tenantName-error" className="text-sm text-destructive">
              {fieldErrors.tenantName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="domain">Domínio</Label>
          <Input
            id="domain"
            name="domain"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="oficina-do-joao"
            value={values.domain}
            onChange={handleChange('domain')}
            onBlur={handleDomainBlur}
            aria-invalid={Boolean(fieldErrors.domain)}
            aria-describedby={fieldErrors.domain ? 'domain-error' : 'domain-hint'}
            disabled={isSubmitting}
          />
          {fieldErrors.domain ? (
            <p id="domain-error" className="text-sm text-destructive">
              {fieldErrors.domain}
            </p>
          ) : (
            <p id="domain-hint" className="text-xs text-muted-foreground">
              Use letras minúsculas, números e hífens. É por ele que você fará login.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold">Seu acesso</legend>

        <div className="flex flex-col gap-2">
          <Label htmlFor="accountName">Seu nome</Label>
          <Input
            id="accountName"
            name="accountName"
            type="text"
            autoComplete="name"
            placeholder="João da Silva"
            value={values.accountName}
            onChange={handleChange('accountName')}
            aria-invalid={Boolean(fieldErrors.accountName)}
            aria-describedby={fieldErrors.accountName ? 'accountName-error' : undefined}
            disabled={isSubmitting}
          />
          {fieldErrors.accountName ? (
            <p id="accountName-error" className="text-sm text-destructive">
              {fieldErrors.accountName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={values.password}
              onChange={handleChange('password')}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
              disabled={isSubmitting}
            />
            {fieldErrors.password ? (
              <p id="password-error" className="text-sm text-destructive">
                {fieldErrors.password}
              </p>
            ) : (
              <p id="password-hint" className="text-xs text-muted-foreground">
                Mínimo de 10 caracteres.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="passwordConfirmation">Confirmar senha</Label>
            <Input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={values.passwordConfirmation}
              onChange={handleChange('passwordConfirmation')}
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
        </div>
      </fieldset>

      {formError ? <Alert variant="destructive">{formError}</Alert> : null}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  );
}
