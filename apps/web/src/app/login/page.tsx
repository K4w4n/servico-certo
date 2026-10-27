import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/modules/identity/components/auth-shell';
import { AUTH_CARD_CLASS, AUTH_FOOTER_CLASS } from '@/modules/identity/components/auth-form-styles';
import { LoginForm } from '@/modules/identity/components/login-form';

export const metadata: Metadata = {
  title: 'Entrar | Serviço Certo',
};

export default function LoginPage() {
  return (
    <AuthShell>
      <div className={AUTH_CARD_CLASS}>
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-brand uppercase">
            <span className="size-1.5 rounded-full bg-brand" />
            Acesse sua conta
          </span>

          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
            Bem-vindo de volta
          </h2>

          <p className="text-sm leading-relaxed text-fog/70">
            Informe o domínio do seu negócio, seu e-mail e sua senha.
          </p>
        </div>

        <div className="mt-7">
          <LoginForm />
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand underline-offset-4 transition-colors hover:text-brand-deep hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-3">
        <p className="text-sm text-fog/55">Ainda não tem uma conta?</p>

        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-md border border-white/15 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:border-brand/40 hover:bg-white/5 hover:text-brand focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none"
        >
          Criar negócio
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <p className={AUTH_FOOTER_CLASS}>
        <ShieldCheck className="size-3.5" />
        Conexão segura · © 2026 Serviço Certo
      </p>
    </AuthShell>
  );
}
