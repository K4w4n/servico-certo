import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/modules/identity/components/login-form';
import { LoginHero } from '@/modules/identity/components/login-hero';

export const metadata: Metadata = {
  title: 'Entrar | Serviço Certo',
};

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function LoginPage() {
  return (
    <main className="dark relative min-h-screen overflow-hidden bg-ink font-brand text-fog">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 right-[-12%] size-[620px] rounded-full bg-brand/15 blur-[150px]" />
        <div className="absolute bottom-[-25%] left-[-15%] size-[560px] rounded-full bg-brand-deep/10 blur-[160px]" />

        <svg
          viewBox="0 0 520 520"
          fill="none"
          className="absolute -top-28 right-[-120px] hidden h-[760px] w-[760px] opacity-70 lg:block"
        >
          <defs>
            <linearGradient
              id="leaf-gold"
              x1="140"
              y1="60"
              x2="380"
              y2="440"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#F5C518" stopOpacity="0.28" />
              <stop offset="1" stopColor="#E8A900" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient
              id="leaf-steel"
              x1="220"
              y1="40"
              x2="440"
              y2="480"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FFFFFF" stopOpacity="0.09" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g transform="rotate(-22 300 300)">
            <path
              d="M300 40C396 102 424 214 300 334C176 214 204 102 300 40Z"
              fill="url(#leaf-gold)"
            />
            <path
              d="M300 78V322"
              stroke="#1A1A1A"
              strokeOpacity="0.35"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          <g transform="rotate(28 320 300)">
            <path
              d="M320 90C412 148 438 252 320 356C202 252 228 148 320 90Z"
              fill="url(#leaf-steel)"
            />
            <path
              d="M320 128V344"
              stroke="#FFFFFF"
              strokeOpacity="0.12"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          <path
            d="M150 360C236 402 262 468 236 512C164 490 130 430 150 360Z"
            stroke="#F5C518"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
        </svg>

        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-soft-light"
          style={{ backgroundImage: GRAIN }}
        />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-[1.15fr_1px_0.9fr] lg:gap-10 lg:px-10 lg:py-16 xl:gap-12">
        <LoginHero />

        <div
          aria-hidden
          className="hidden self-stretch bg-gradient-to-b from-transparent via-white/15 to-transparent lg:block"
        />

        <section className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="relative rounded-[28px] border border-white/10 bg-surface/70 p-6 shadow-[0_50px_120px_-55px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-brand uppercase">
                <span className="size-1.5 rounded-full bg-brand" />
                Acesse sua conta
              </span>

              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
                Bem-vindo de volta
              </h2>

              <p className="text-sm leading-relaxed text-fog/70">
                Informe o domínio do seu negócio, seu e-mail e sua senha.
              </p>
            </div>

            <div className="mt-7">
              <LoginForm />
            </div>

            <div className="mt-5 text-center">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-brand underline-offset-4 transition-colors hover:text-brand-deep hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            <p className="text-sm text-fog/55">Ainda não tem uma conta?</p>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:border-brand/40 hover:bg-white/5 hover:text-brand focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none"
            >
              Criar negócio
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-fog/40">
            <ShieldCheck className="size-3.5" />
            Conexão segura · © 2026 Serviço Certo
          </p>
        </section>
      </div>
    </main>
  );
}
