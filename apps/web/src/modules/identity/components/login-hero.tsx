import Link from 'next/link';
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const MODULES: { label: string; description: string; icon: LucideIcon }[] = [
  { label: 'Clientes', description: 'Cadastro e histórico', icon: Users },
  { label: 'Produtos', description: 'Catálogo com preço', icon: Package },
  { label: 'Serviços', description: 'Tabela de preços', icon: Wrench },
  { label: 'Ordens', description: 'Protocolo e PDF', icon: ClipboardList },
];

const HIGHLIGHTS: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: 'Comprovante em PDF',
    description: 'Recibo pronto para imprimir ou enviar ao cliente.',
    icon: FileText,
  },
  {
    title: 'Seu negócio organizado',
    description: 'Clientes, catálogo e ordens centralizados, sem planilha.',
    icon: LayoutDashboard,
  },
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-deep text-ink shadow-[0_14px_34px_-16px_rgba(245,197,24,0.95)]">
        <Wrench className="size-5" strokeWidth={2.2} />
      </span>

      <span className="flex flex-col">
        <span className="text-sm font-semibold tracking-[0.16em] text-white uppercase">
          Serviço Certo
        </span>
        <span className="text-xs text-fog/60">
          por{' '}
          <Link
            href="https://kawan.dev.br"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-brand"
          >
            kawan.dev.br
          </Link>
        </span>
      </span>
    </div>
  );
}

export function LoginHero() {
  return (
    <div className="relative flex flex-col gap-7 lg:gap-11">
      <BrandMark />

      <div className="flex flex-col gap-5">
        <h1 className="max-w-xl text-[2.65rem] leading-[1.02] font-extrabold tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.1rem]">
          Serviço Certo.
          <span className="mt-2 block bg-gradient-to-r from-brand via-brand to-brand-deep bg-clip-text pb-1 text-transparent">
            Tudo em ordem.
          </span>
        </h1>

        <p className="max-w-md text-base leading-relaxed text-fog/80 sm:text-lg">
          Ordens de serviço, catálogo e comprovantes em PDF em um só lugar — do orçamento ao recibo,
          sem planilha.
        </p>
      </div>

      <div className="hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-[0_40px_100px_-60px_rgba(0,0,0,0.95)] backdrop-blur-md lg:block">
        <ul className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-4">
          {MODULES.map(({ label, description, icon: Icon }) => (
            <li
              key={label}
              className="flex flex-col gap-3 rounded-2xl p-4 transition-colors hover:bg-white/[0.04]"
            >
              <span className="flex size-10 items-center justify-center rounded-full border border-brand/30 bg-brand/[0.07] text-brand">
                <Icon className="size-[18px]" strokeWidth={1.6} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-white">{label}</span>
                <span className="text-xs leading-relaxed text-fog/55">{description}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden gap-3 sm:grid-cols-2 lg:grid">
        {HIGHLIGHTS.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-surface to-ink p-4"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-brand/12 text-brand ring-1 ring-brand/25">
              <Icon className="size-4" strokeWidth={1.7} />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-white">{title}</span>
              <span className="text-xs leading-relaxed text-fog/55">{description}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
