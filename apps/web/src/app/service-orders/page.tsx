import type { Metadata } from 'next';
import { AppShell } from '@/modules/identity/components/app-shell';
import { ServiceOrdersScreen } from '@/modules/service-orders/components/service-orders-screen';

export const metadata: Metadata = {
  title: 'Ordens de serviço | Serviço Certo',
};

export default function ServiceOrdersPage() {
  return (
    <AppShell theme="dark">
      <ServiceOrdersScreen />
    </AppShell>
  );
}
