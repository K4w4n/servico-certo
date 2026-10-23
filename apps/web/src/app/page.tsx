'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/identity/providers/auth-provider';
import { Button } from '@/shared/ui/button';

export default function Home() {
  const { account, logout, status, tenant } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [router, status]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  if (status !== 'authenticated' || !account || !tenant) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Carregando sessão…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Serviço Certo
            </span>
            <span className="text-lg font-semibold tracking-tight">{tenant.name}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden flex-col text-right sm:flex">
              <span className="text-sm font-medium">{account.name}</span>
              <span className="text-xs text-muted-foreground">{account.email}</span>
            </div>
            <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <section className="rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
          <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Em construção
          </span>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Olá, {account.name}</h1>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Você entrou no tenant{' '}
            <strong className="font-medium text-foreground">{tenant.name}</strong> (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tenant.domain}</code>). As
            telas de ordens de serviço, faturamento e estoque serão adicionadas em breve.
          </p>
        </section>
      </div>
    </main>
  );
}
