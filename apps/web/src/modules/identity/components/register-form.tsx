'use client';

import { registerTenantSchema } from '@servico-certo/contracts';
import {
  Building2,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError } from '@/shared/lib/api-client';
import { cn } from '@/shared/lib/cn';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useAuth } from '../providers/auth-provider';
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS } from './auth-form-styles';

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

const LEGEND_CLASS = 'mb-2 text-sm font-semibold text-white';

const ICON_CLASS =
  'pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fog/40';

const TOGGLE_CLASS =
  'absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-fog/50 transition-colors hover:bg-white/5 hover:text-brand focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
    return <p className="py-6 text-center text-sm text-fog/60">Carregando sessão…</p>;
  }

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      <fieldset className="flex flex-col gap-4">
        <legend className={LEGEND_CLASS}>Seu negócio</legend>

        <div className="flex flex-col gap-2">
          <Label htmlFor="tenantName" className={AUTH_LABEL_CLASS}>
            Nome do negócio
          </Label>
          <div className="relative">
            <Building2 aria-hidden className={ICON_CLASS} strokeWidth={1.7} />
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
              className={AUTH_INPUT_CLASS}
            />
          </div>
          {fieldErrors.tenantName ? (
            <p id="tenantName-error" className="text-sm text-destructive">
              {fieldErrors.tenantName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="domain" className={AUTH_LABEL_CLASS}>
            Domínio
          </Label>
          <div className="relative">
            <Globe aria-hidden className={ICON_CLASS} strokeWidth={1.7} />
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
              className={AUTH_INPUT_CLASS}
            />
          </div>
          {fieldErrors.domain ? (
            <p id="domain-error" className="text-sm text-destructive">
              {fieldErrors.domain}
            </p>
          ) : (
            <p id="domain-hint" className="text-xs text-fog/45">
              Use letras minúsculas, números e hífens. É por ele que você fará login.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-white/5 pt-6">
        <legend className={LEGEND_CLASS}>Seu acesso</legend>

        <div className="flex flex-col gap-2">
          <Label htmlFor="accountName" className={AUTH_LABEL_CLASS}>
            Seu nome
          </Label>
          <div className="relative">
            <UserRound aria-hidden className={ICON_CLASS} strokeWidth={1.7} />
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
              className={AUTH_INPUT_CLASS}
            />
          </div>
          {fieldErrors.accountName ? (
            <p id="accountName-error" className="text-sm text-destructive">
              {fieldErrors.accountName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className={AUTH_LABEL_CLASS}>
            E-mail
          </Label>
          <div className="relative">
            <Mail aria-hidden className={ICON_CLASS} strokeWidth={1.7} />
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
              className={AUTH_INPUT_CLASS}
            />
          </div>
          {fieldErrors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className={AUTH_LABEL_CLASS}>
              Senha
            </Label>
            <div className="relative">
              <Lock aria-hidden className={ICON_CLASS} strokeWidth={1.7} />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={values.password}
                onChange={handleChange('password')}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
                disabled={isSubmitting}
                className={cn(AUTH_INPUT_CLASS, 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className={TOGGLE_CLASS}
              >
                {showPassword ? (
                  <EyeOff className="size-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="size-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
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
            <Label htmlFor="passwordConfirmation" className={AUTH_LABEL_CLASS}>
              Confirmar senha
            </Label>
            <div className="relative">
              <ShieldCheck aria-hidden className={ICON_CLASS} strokeWidth={1.7} />
              <Input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type={showConfirmation ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={values.passwordConfirmation}
                onChange={handleChange('passwordConfirmation')}
                aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                aria-describedby={
                  fieldErrors.passwordConfirmation ? 'passwordConfirmation-error' : undefined
                }
                disabled={isSubmitting}
                className={cn(AUTH_INPUT_CLASS, 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmation((current) => !current)}
                aria-label={
                  showConfirmation ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'
                }
                aria-pressed={showConfirmation}
                className={TOGGLE_CLASS}
              >
                {showConfirmation ? (
                  <EyeOff className="size-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="size-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
            {fieldErrors.passwordConfirmation ? (
              <p id="passwordConfirmation-error" className="text-sm text-destructive">
                {fieldErrors.passwordConfirmation}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

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
            Criando conta…
          </>
        ) : (
          'Criar conta'
        )}
      </Button>
    </form>
  );
}
