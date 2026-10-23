import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/modules/identity/components/register-form';

export const metadata: Metadata = {
  title: 'Criar conta | Serviço Certo',
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen justify-center bg-muted/40 px-6 py-10 sm:items-center">
      <section className="w-full max-w-lg">
        <div className="mb-6 flex flex-col gap-2 text-center">
          <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Serviço Certo
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Criar sua conta</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre seu negócio e a primeira conta de acesso.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <RegisterForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
