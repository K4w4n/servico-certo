import type { Metadata } from 'next';
import { AppShell } from '@/modules/identity/components/app-shell';
import { CustomersScreen } from '@/modules/customers/components/customers-screen';

export const metadata: Metadata = {
  title: 'Clientes | Serviço Certo',
};

export default function CustomersPage() {
  return (
    <AppShell>
      <CustomersScreen />
    </AppShell>
  );
}
