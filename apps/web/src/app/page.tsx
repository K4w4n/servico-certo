'use client';

import { AppShell } from '@/modules/identity/components/app-shell';
import { useAuth } from '@/modules/identity/providers/auth-provider';

export default function Home() {
  return (
    <AppShell>
      <HomeContent />
    </AppShell>
  );
}

function HomeContent() {
  const { account, tenant } = useAuth();

  if (!account || !tenant) {
    return null;
  }

  return (
    <section className="rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
      <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        Em construção
      </span>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Olá, {account.name}</h1>

      <p className="mt-2 max-w-2xl text-muted-foreground">
        Você entrou no tenant <strong className="font-medium text-foreground">{tenant.name}</strong>{' '}
        (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tenant.domain}</code>). As telas
        de ordens de serviço, faturamento e estoque serão adicionadas em breve.
      </p>
    </section>
  );
}
