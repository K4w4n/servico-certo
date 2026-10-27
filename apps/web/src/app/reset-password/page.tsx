import type { Metadata } from 'next';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Suspense } from 'react';
import { AuthShell } from '@/modules/identity/components/auth-shell';
import { AUTH_CARD_CLASS, AUTH_FOOTER_CLASS } from '@/modules/identity/components/auth-form-styles';
import { ResetPasswordFlow } from '@/modules/identity/components/reset-password-flow';

export const metadata: Metadata = {
  title: 'Redefinir senha | Serviço Certo',
};

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <div className={AUTH_CARD_CLASS}>
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-brand uppercase">
            <span className="size-1.5 rounded-full bg-brand" />
            Defina uma nova senha
          </span>

          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
            Redefinir senha
          </h2>

          <p className="text-sm leading-relaxed text-fog/70">
            Crie uma nova senha para acessar sua conta.
          </p>
        </div>

        <div className="mt-7">
          <Suspense
            fallback={
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-fog/60">
                <Loader2 className="size-4 animate-spin" />
                Validando link…
              </p>
            }
          >
            <ResetPasswordFlow />
          </Suspense>
        </div>
      </div>

      <p className={AUTH_FOOTER_CLASS}>
        <ShieldCheck className="size-3.5" />
        Conexão segura · © 2026 Serviço Certo
      </p>
    </AuthShell>
  );
}
