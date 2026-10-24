'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { useAuth } from '../providers/auth-provider';

const NAV_ITEMS = [
  { href: '/', label: 'Início' },
  { href: '/customers', label: 'Clientes' },
  { href: '/products', label: 'Produtos' },
  { href: '/accounts', label: 'Usuários' },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { account, tenant, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Serviço Certo
              </span>
              <span className="text-lg font-semibold tracking-tight">{tenant.name}</span>
            </div>

            <nav className="flex items-center gap-1" aria-label="Navegação principal">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
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

      <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}
