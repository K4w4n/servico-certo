import type { Metadata } from 'next';
import { AccountsScreen } from '@/modules/identity/components/accounts-screen';
import { AppShell } from '@/modules/identity/components/app-shell';

export const metadata: Metadata = {
  title: 'Usuários | Serviço Certo',
};

export default function AccountsPage() {
  return (
    <AppShell>
      <AccountsScreen />
    </AppShell>
  );
}
