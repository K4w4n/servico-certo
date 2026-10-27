import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/modules/identity/components/auth-shell';
import { AUTH_CARD_CLASS, AUTH_FOOTER_CLASS } from '@/modules/identity/components/auth-form-styles';
import { RegisterForm } from '@/modules/identity/components/register-form';

export const metadata: Metadata = {
  title: 'Criar conta | Serviço Certo',
};

export default function RegisterPage() {
  return (
    <AuthShell contentClassName="max-w-lg">
      <div className={AUTH_CARD_CLASS}>
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-brand uppercase">
            <span className="size-1.5 rounded-full bg-brand" />
            Comece agora
          </span>

          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
            Criar sua conta
          </h2>

          <p className="text-sm leading-relaxed text-fog/70">
            Cadastre seu negócio e a primeira conta de acesso. Leva menos de um minuto.
          </p>
        </div>

        <div className="mt-7">
          <RegisterForm />
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-fog/55">
        Já tem uma conta?{' '}
        <Link
          href="/login"
          className="font-medium text-brand underline-offset-4 transition-colors hover:text-brand-deep hover:underline"
        >
          Entrar
        </Link>
      </p>

      <p className={AUTH_FOOTER_CLASS}>
        <ShieldCheck className="size-3.5" />
        Conexão segura · © 2026 Serviço Certo
      </p>
    </AuthShell>
  );
}
