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
  onOpen: (order: ServiceOrder) => void;
  onEdit: (order: ServiceOrder) => void;
  onDelete: (order: ServiceOrder) => void;
  onClearFilters: () => void;
};

export function ServiceOrdersTable({
  orders,
  isLoading,
  hasFilters,
  onOpen,
  onEdit,
  onDelete,
  onClearFilters,
}: ServiceOrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card text-card-foreground">
      <table className="w-full text-sm" aria-busy={isLoading}>
        <caption className="sr-only">Ordens de serviço do tenant</caption>
        <thead className="bg-white/[0.02] text-[11px] tracking-[0.12em] text-fog/45 uppercase">
          <tr className="border-b text-left">
            <th scope="col" className="px-4 py-3 font-semibold">
              Protocolo
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Cliente
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Itens
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Total
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Ações
            </th>
          </tr>
        </thead>

        <tbody className={cn(isLoading && orders.length > 0 && 'opacity-60')}>
          {isLoading && orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-fog/55">
                Carregando ordens de serviço…
              </td>
            </tr>
          ) : null}

          {!isLoading && orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-fog/55">
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
            <tr
              key={order.id}
              className="border-b transition-colors last:border-0 hover:bg-white/[0.02]"
            >
              <td className="px-4 py-3 align-top">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium whitespace-nowrap text-white">
                    {formatProtocol(order.protocol)}
                  </span>
                  <span className="text-xs whitespace-nowrap text-fog/45">
                    {formatServiceOrderDate(order.createdAt)}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3 align-top">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-white">{order.customer.name}</span>
                  {order.customer.phoneNumber ? (
                    <span className="text-xs whitespace-nowrap text-fog/45">
                      {formatPhoneNumber(order.customer.phoneNumber)}
                    </span>
                  ) : null}
                </div>
              </td>

              <td className="max-w-md px-4 py-3 align-top">
                <div className="flex flex-col gap-0.5">
                  <span className="line-clamp-2">{describeServiceOrderItems(order)}</span>
                  <span className="text-xs text-fog/45">{countServiceOrderItems(order)}</span>
                </div>
              </td>

              <td className="px-4 py-3 text-right align-top font-medium whitespace-nowrap text-white">
                {formatPrice(order.totalCents)}
              </td>

              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpen(order)}>
                    Abrir
                  </Button>
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
