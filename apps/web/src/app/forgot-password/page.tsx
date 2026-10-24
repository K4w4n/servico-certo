import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/modules/identity/components/forgot-password-form';

export const metadata: Metadata = {
  title: 'Recuperar senha | Serviço Certo',
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <section className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-2 text-center">
          <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Serviço Certo
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">
            Informe o domínio do negócio e o e-mail da sua conta. Enviaremos um link para criar uma
            nova senha.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <ForgotPasswordForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Lembrou a senha?{' '}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
