'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Wrench } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { AppThemeProvider } from '@/shared/ui/app-theme';
import { Button } from '@/shared/ui/button';
import { useAuth } from '../providers/auth-provider';

const NAV_ITEMS = [
  { href: '/', label: 'Início' },
  { href: '/customers', label: 'Clientes' },
  { href: '/products', label: 'Produtos' },
  { href: '/services', label: 'Serviços' },
  { href: '/service-orders', label: 'Ordens de serviço' },
  { href: '/accounts', label: 'Usuários' },
] as const;

export function AppShell({
  children,
  theme = 'light',
}: {
  children: ReactNode;
  theme?: 'light' | 'dark';
}) {
  const { account, tenant, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isDark = theme === 'dark';

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
      <main
        className={cn(
          'flex min-h-screen items-center justify-center p-6',
          isDark && 'dark bg-ink font-brand',
        )}
      >
        <p className={cn('text-sm', isDark ? 'text-fog/60' : 'text-muted-foreground')}>
          Carregando sessão…
        </p>
      </main>
    );
  }

  return (
    <AppThemeProvider theme={theme}>
      <main
        className={cn(
          'min-h-screen',
          isDark ? 'dark relative overflow-hidden bg-ink font-brand text-fog' : 'bg-muted/40',
        )}
      >
        {isDark ? (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-48 right-[-12%] size-[620px] rounded-full bg-brand/12 blur-[150px]" />
            <div className="absolute bottom-[-30%] left-[-15%] size-[560px] rounded-full bg-brand-deep/10 blur-[160px]" />
          </div>
        ) : null}

        <header
          className={cn(
            isDark
              ? 'relative z-10 border-b border-white/10 bg-ink/70 backdrop-blur-xl'
              : 'border-b bg-background',
          )}
        >
          <div
            className={cn(
              'mx-auto w-full max-w-6xl px-6 py-4',
              isDark
                ? 'grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 lg:flex lg:flex-wrap lg:justify-start'
                : 'flex flex-wrap items-center justify-between gap-4',
            )}
          >
            {isDark ? (
              <div className="col-start-1 row-start-1 flex items-center gap-3 lg:mr-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-deep text-ink shadow-[0_10px_26px_-14px_rgba(245,197,24,0.9)]">
                  <Wrench className="size-4" strokeWidth={2.2} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[10px] font-semibold tracking-[0.18em] text-fog/50 uppercase">
                    Serviço Certo
                  </span>
                  <span className="text-base font-semibold tracking-tight text-white">
                    {tenant.name}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Serviço Certo
                </span>
                <span className="text-lg font-semibold tracking-tight">{tenant.name}</span>
              </div>
            )}

            <nav
              className={cn(
                isDark
                  ? 'col-span-3 row-start-2 flex w-full items-center gap-1 overflow-x-auto lg:col-span-1 lg:row-start-1 lg:mr-auto lg:w-auto lg:overflow-visible'
                  : 'flex flex-wrap items-center gap-1',
              )}
              aria-label="Navegação principal"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                      isDark && 'shrink-0',
                      isDark
                        ? isActive
                          ? 'bg-brand/15 text-brand'
                          : 'text-fog/60 hover:bg-white/5 hover:text-white'
                        : isActive
                          ? 'bg-secondary text-secondary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div
              className={cn(
                'flex items-center gap-4',
                isDark && 'col-start-3 row-start-1 justify-self-end lg:ml-auto',
              )}
            >
              <div className="hidden flex-col text-right sm:flex">
                <span className={cn('text-sm font-medium', isDark && 'text-white')}>
                  {account.name}
                </span>
                <span className={cn('text-xs', isDark ? 'text-fog/50' : 'text-muted-foreground')}>
                  {account.email}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={
                  isDark
                    ? 'border-white/15 bg-transparent text-white hover:border-brand/40 hover:bg-white/5 hover:text-brand'
                    : undefined
                }
              >
                {isLoggingOut ? 'Saindo…' : 'Sair'}
              </Button>
            </div>
          </div>
        </header>

        <div className="relative mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
      </main>
    </AppThemeProvider>
  );
}
