'use client';

import {
  passwordSchema,
  resetTokenSchema,
  type PasswordResetContext,
} from '@servico-certo/contracts';
import {
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  Link2Off,
  Loader2,
  ShieldCheck,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '@/shared/lib/api-client';
import { cn } from '@/shared/lib/cn';
import { Alert } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { resetPassword, validatePasswordResetToken } from '../lib/auth-api';
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS } from './auth-form-styles';

const INVALID_LINK_MESSAGE = 'Este link é inválido ou expirou. Solicite um novo link.';
const USED_LINK_MESSAGE = 'Este link expirou ou já foi utilizado. Solicite um novo link.';

type FlowState =
  | { status: 'validating' }
  | { status: 'ready'; context: PasswordResetContext; token: string }
  | { status: 'invalid'; message: string }
  | { status: 'network-error' }
  | { status: 'success' };

function formatExpiration(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function StateIcon({
  icon: Icon,
  tone = 'brand',
}: {
  icon: LucideIcon;
  tone?: 'brand' | 'destructive';
}) {
  return (
    <span
      className={cn(
        'mx-auto flex size-14 items-center justify-center rounded-2xl border',
        tone === 'brand'
          ? 'border-brand/25 bg-brand/10 text-brand'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="size-6" strokeWidth={1.6} />
    </span>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={cn(buttonVariants({ variant: 'brand', size: 'xl' }), 'w-full')}>
      {children}
    </a>
  );
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="text-sm font-medium text-brand underline-offset-4 transition-colors hover:text-brand-deep hover:underline"
    >
      {children}
    </a>
  );
}

function InvalidState({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-5">
      <StateIcon icon={Link2Off} tone="destructive" />

      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Link inválido ou expirado
        </h2>
        <p className="text-sm leading-relaxed text-fog/70">{message}</p>
      </div>

      <PrimaryLink href="/forgot-password">Solicitar novo link</PrimaryLink>

      <div className="text-center">
        <SecondaryLink href="/login">Voltar para o login</SecondaryLink>
      </div>
    </div>
  );
}

function ResetPasswordForm({
  token,
  onSuccess,
  onInvalidToken,
}: {
  token: string;
  onSuccess: () => void;
  onInvalidToken: () => void;
}) {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);
    setFieldErrors((current) => ({ ...current, password: undefined }));
    setFormError(null);
  }

  function handleConfirmationChange(event: ChangeEvent<HTMLInputElement>) {
    setPasswordConfirmation(event.target.value);
    setFieldErrors((current) => ({ ...current, confirmation: undefined }));
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
      setFieldErrors({ confirmation: 'As senhas não conferem' });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await resetPassword({ token, password: result.data });
      onSuccess();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_RESET_TOKEN') {
        onInvalidToken();
      } else if (error instanceof ApiError && error.code === 'WEAK_PASSWORD') {
        setFieldErrors({ password: 'A senha deve ter entre 10 e 128 caracteres' });
      } else {
        setFormError(
          error instanceof ApiError && error.status === 0
            ? 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.'
            : 'Não foi possível redefinir a senha. Tente novamente.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className={AUTH_LABEL_CLASS}>
          Nova senha
        </Label>
        <div className="relative">
          <KeyRound
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fog/40"
            strokeWidth={1.7}
          />
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            placeholder="••••••••"
            value={password}
            onChange={handlePasswordChange}
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
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-fog/50 transition-colors hover:bg-white/5 hover:text-brand focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none"
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
          Confirmar nova senha
        </Label>
        <div className="relative">
          <ShieldCheck
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fog/40"
            strokeWidth={1.7}
          />
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type={showConfirmation ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={passwordConfirmation}
            onChange={handleConfirmationChange}
            aria-invalid={Boolean(fieldErrors.confirmation)}
            aria-describedby={fieldErrors.confirmation ? 'passwordConfirmation-error' : undefined}
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
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-fog/50 transition-colors hover:bg-white/5 hover:text-brand focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none"
          >
            {showConfirmation ? (
              <EyeOff className="size-4" strokeWidth={1.8} />
            ) : (
              <Eye className="size-4" strokeWidth={1.8} />
            )}
          </button>
        </div>
        {fieldErrors.confirmation ? (
          <p id="passwordConfirmation-error" className="text-sm text-destructive">
            {fieldErrors.confirmation}
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
            Redefinindo…
          </>
        ) : (
          'Redefinir senha'
        )}
      </Button>
    </form>
  );
}

export function ResetPasswordFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<FlowState>({ status: 'validating' });

  useEffect(() => {
    if (!token) {
      setState({ status: 'invalid', message: INVALID_LINK_MESSAGE });
      return;
    }

    const parsedToken = resetTokenSchema.safeParse(token);

    if (!parsedToken.success) {
      setState({ status: 'invalid', message: INVALID_LINK_MESSAGE });
      return;
    }

    let cancelled = false;

    setState({ status: 'validating' });

    validatePasswordResetToken(parsedToken.data)
      .then((context) => {
        if (!cancelled) {
          setState({ status: 'ready', context, token: parsedToken.data });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        if (
          error instanceof ApiError &&
          (error.code === 'INVALID_RESET_TOKEN' || error.code === 'VALIDATION_ERROR')
        ) {
          setState({ status: 'invalid', message: INVALID_LINK_MESSAGE });
          return;
        }

        setState({ status: 'network-error' });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, token]);

  if (state.status === 'validating') {
    return (
      <p className="flex items-center justify-center gap-2 py-6 text-sm text-fog/60">
        <Loader2 className="size-4 animate-spin" />
        Validando link…
      </p>
    );
  }

  if (state.status === 'invalid') {
    return <InvalidState message={state.message} />;
  }

  if (state.status === 'network-error') {
    return (
      <div className="flex flex-col gap-5">
        <StateIcon icon={WifiOff} />

        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Não foi possível validar o link
          </h2>
          <p className="text-sm leading-relaxed text-fog/70">
            Verifique sua conexão e tente novamente.
          </p>
        </div>

        <Button
          variant="brand"
          size="xl"
          className="w-full"
          onClick={() => setAttempt((current) => current + 1)}
        >
          Tentar novamente
        </Button>

        <div className="text-center">
          <SecondaryLink href="/login">Voltar para o login</SecondaryLink>
        </div>
      </div>
    );
  }

  if (state.status === 'success') {
    return (
      <div className="flex flex-col gap-5 text-center">
        <StateIcon icon={CircleCheck} />

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-white">Senha redefinida</h2>
          <p className="text-sm leading-relaxed text-fog/70">
            Sua senha foi alterada com sucesso. Por segurança, entre novamente com a nova senha.
          </p>
        </div>

        <PrimaryLink href="/login">Ir para o login</PrimaryLink>
      </div>
    );
  }

  const expiresAt = formatExpiration(state.context.expiresAt);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-brand/20 bg-brand/[0.06] px-4 py-3 text-sm">
        <p className="leading-relaxed text-fog/80">
          Redefinindo a senha de{' '}
          <strong className="font-semibold text-white">{state.context.account.email}</strong> em{' '}
          <strong className="font-semibold text-white">{state.context.tenant.name}</strong>.
        </p>
        {expiresAt ? (
          <p className="mt-1 text-xs text-fog/50">Link válido até {expiresAt}.</p>
        ) : null}
      </div>

      <ResetPasswordForm
        token={state.token}
        onSuccess={() => setState({ status: 'success' })}
        onInvalidToken={() => setState({ status: 'invalid', message: USED_LINK_MESSAGE })}
      />
    </div>
  );
}
