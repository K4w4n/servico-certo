import type { Customer, Product, Service } from '@servico-certo/contracts';
import { listCustomers } from '@/modules/customers/lib/customers-api';
import { listProducts } from '@/modules/products/lib/products-api';
import { listServices } from '@/modules/services/lib/services-api';
import type { ApiClient } from '@/shared/lib/api-client';
import { loadAllPages } from '@/shared/lib/load-all';

export type ServiceOrderReferences = {
  customers: Customer[];
  products: Product[];
  services: Service[];
};

export async function loadServiceOrderReferences(
  request: ApiClient['fetch'],
): Promise<ServiceOrderReferences> {
  const [customers, products, services] = await Promise.all([
    loadAllPages(request, listCustomers),
    loadAllPages(request, listProducts),
    loadAllPages(request, listServices),
  ]);

  return { customers, products, services };
}
