import type { Metadata } from 'next';
import { AppShell } from '@/modules/identity/components/app-shell';
import { ProductsScreen } from '@/modules/products/components/products-screen';

export const metadata: Metadata = {
  title: 'Produtos | Serviço Certo',
};

export default function ProductsPage() {
  return (
    <AppShell>
      <ProductsScreen />
    </AppShell>
  );
}
