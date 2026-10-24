import type { Metadata } from 'next';
import { AppShell } from '@/modules/identity/components/app-shell';
import { ServicesScreen } from '@/modules/services/components/services-screen';

export const metadata: Metadata = {
  title: 'Serviços | Serviço Certo',
};

export default function ServicesPage() {
  return (
    <AppShell>
      <ServicesScreen />
    </AppShell>
  );
}
