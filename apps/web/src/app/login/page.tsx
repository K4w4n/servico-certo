import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/modules/identity/components/login-form';

export const metadata: Metadata = {
  title: 'Entrar | Serviço Certo',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <section className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-2 text-center">
          <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Serviço Certo
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Entrar na sua conta</h1>
          <p className="text-sm text-muted-foreground">
            Informe o domínio do seu negócio, seu e-mail e sua senha.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <LoginForm />

          <div className="mt-5 text-center">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem uma conta?{' '}
          <Link
            href="/register"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Criar negócio
          </Link>
        </p>
      </section>
    </main>
  );
}
