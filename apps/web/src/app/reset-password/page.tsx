import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordFlow } from '@/modules/identity/components/reset-password-flow';

export const metadata: Metadata = {
  title: 'Redefinir senha | Serviço Certo',
};

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <section className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-2 text-center">
          <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Serviço Certo
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground">
            Crie uma nova senha para acessar sua conta.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <Suspense
            fallback={
              <p className="py-6 text-center text-sm text-muted-foreground">Validando link…</p>
            }
          >
            <ResetPasswordFlow />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
