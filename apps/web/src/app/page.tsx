'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  ClipboardList,
  LockKeyhole,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { AppShell } from '@/modules/identity/components/app-shell';
import { useAuth } from '@/modules/identity/providers/auth-provider';
import { cn } from '@/shared/lib/cn';
import { buttonVariants } from '@/shared/ui/button';

const MODULES: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  {
    href: '/service-orders',
    label: 'Ordens de serviço',
    description: 'Abra uma ordem, acompanhe o atendimento e emita o comprovante em PDF.',
    icon: ClipboardList,
  },
  {
    href: '/customers',
    label: 'Clientes',
    description: 'Cadastre clientes e consulte o histórico de cada um.',
    icon: Users,
  },
  {
    href: '/products',
    label: 'Produtos',
    description: 'Mantenha o catálogo e os preços sempre atualizados.',
    icon: Package,
  },
  {
    href: '/services',
    label: 'Serviços',
    description: 'Organize a tabela de serviços oferecidos pelo negócio.',
    icon: Wrench,
  },
  {
    href: '/accounts',
    label: 'Usuários',
    description: 'Controle quem tem acesso ao sistema.',
    icon: ShieldCheck,
  },
];

const UPCOMING = [
  { label: 'Estoque e movimentações', icon: Boxes },
  { label: 'Faturamento e nota', icon: ReceiptText },
  { label: 'Permissões e papéis', icon: LockKeyhole },
];

export default function Home() {
  return (
    <AppShell theme="dark">
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
    <div className="flex flex-col">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-surface/90 via-ink to-ink p-6 shadow-[0_50px_120px_-70px_rgba(0,0,0,1)] sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-8%] size-72 rounded-full bg-brand/20 blur-[100px]"
        />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
              <Sparkles className="size-3.5" />
              Painel do negócio
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-fog/55">
              <span className="size-1.5 rounded-full bg-brand" />
              Em construção
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
              Olá, {account.name}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-fog/70 sm:text-base">
              Este é o painel de <strong className="font-semibold text-white">{tenant.name}</strong>
              . Abra uma ordem, consulte o catálogo e mantenha o negócio em ordem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-fog/60">
              <Building2 className="size-3.5 text-brand/80" />
              {tenant.domain}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-fog/60">
              <ShieldCheck className="size-3.5 text-brand/80" />
              {account.status === 'ACTIVE' ? 'Conta ativa' : 'Conta bloqueada'}
            </span>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <Link
              href="/service-orders"
              className={cn(buttonVariants({ variant: 'brand', size: 'xl' }), 'group')}
            >
              Nova ordem de serviço
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/customers"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-6 text-sm font-medium text-white transition-colors hover:border-brand/40 hover:bg-white/5 hover:text-brand focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none"
            >
              Ver clientes
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] text-fog/45 uppercase">
            Acesso rápido
          </h2>
          <p className="text-sm text-fog/60">
            Os módulos que já estão prontos para o seu dia a dia.
          </p>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ href, label, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-brand/30 hover:bg-white/[0.05] focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none"
              >
                <span className="flex size-10 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
                  <Icon className="size-5" strokeWidth={1.7} />
                </span>
                <span className="flex flex-1 flex-col gap-1.5">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    {label}
                    <ArrowUpRight className="size-3.5 text-brand opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="text-xs leading-relaxed text-fog/55">{description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-surface/70 to-ink p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-white">O que vem por aí</h2>
          <p className="text-sm text-fog/55">
            Próximas entregas para completar a gestão do negócio.
          </p>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {UPCOMING.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-fog/50">
                <Icon className="size-4" strokeWidth={1.7} />
              </span>
              <span className="text-sm text-fog/60">{label}</span>
              <span className="ml-auto text-[10px] font-semibold tracking-[0.16em] text-fog/35 uppercase">
                Em breve
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
