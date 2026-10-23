import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/modules/identity/providers/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Serviço Certo',
  description: 'Sistema de Ordens de Serviço para pequenos negócios.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
