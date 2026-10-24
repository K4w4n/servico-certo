'use client';

import type { ServiceOrder } from '@servico-certo/contracts';
import { formatPhoneNumber } from '@/modules/customers/lib/customer-format';
import { cn } from '@/shared/lib/cn';
import { formatPrice } from '@/shared/lib/price';
import { Button } from '@/shared/ui/button';
import {
  countServiceOrderItems,
  describeServiceOrderItems,
  formatProtocol,
  formatServiceOrderDate,
} from '../lib/service-order-format';

type ServiceOrdersTableProps = {
  orders: ServiceOrder[];
  isLoading: boolean;
  hasFilters: boolean;
  onEdit: (order: ServiceOrder) => void;
  onDelete: (order: ServiceOrder) => void;
  onClearFilters: () => void;
};

export function ServiceOrdersTable({
  orders,
  isLoading,
  hasFilters,
  onEdit,
  onDelete,
  onClearFilters,
}: ServiceOrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card text-card-foreground shadow-sm">
      <table className="w-full text-sm" aria-busy={isLoading}>
        <caption className="sr-only">Ordens de serviço do tenant</caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="px-4 py-3 font-medium">
              Protocolo
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Cliente
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Itens
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Total
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Ações
            </th>
          </tr>
        </thead>

        <tbody className={cn(isLoading && orders.length > 0 && 'opacity-60')}>
          {isLoading && orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                Carregando ordens de serviço…
              </td>
            </tr>
          ) : null}

          {!isLoading && orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-muted-foreground">
                    {hasFilters
                      ? 'Nenhuma ordem de serviço encontrada para os filtros informados.'
                      : 'Nenhuma ordem de serviço cadastrada ainda.'}
                  </p>
                  {hasFilters ? (
                    <Button variant="outline" size="sm" onClick={onClearFilters}>
                      Limpar filtros
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ) : null}

          {orders.map((order) => (
            <tr key={order.id} className="border-b last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium whitespace-nowrap">
                    {formatProtocol(order.protocol)}
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatServiceOrderDate(order.createdAt)}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3 align-top">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{order.customer.name}</span>
                  {order.customer.phoneNumber ? (
                    <span className="text-xs text-muted-foreground">
                      {formatPhoneNumber(order.customer.phoneNumber)}
                    </span>
                  ) : null}
                </div>
              </td>

              <td className="max-w-md px-4 py-3 align-top">
                <div className="flex flex-col gap-0.5">
                  <span className="line-clamp-2">{describeServiceOrderItems(order)}</span>
                  <span className="text-xs text-muted-foreground">
                    {countServiceOrderItems(order)}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3 text-right align-top font-medium whitespace-nowrap">
                {formatPrice(order.totalCents)}
              </td>

              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(order)}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDelete(order)}
                  >
                    Excluir
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
