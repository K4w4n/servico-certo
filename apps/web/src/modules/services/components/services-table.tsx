'use client';

import type { Service } from '@servico-certo/contracts';
import { cn } from '@/shared/lib/cn';
import { formatPrice } from '@/shared/lib/price';
import { Button } from '@/shared/ui/button';

type ServicesTableProps = {
  services: Service[];
  isLoading: boolean;
  hasFilters: boolean;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onClearFilters: () => void;
};

export function ServicesTable({
  services,
  isLoading,
  hasFilters,
  onEdit,
  onDelete,
  onClearFilters,
}: ServicesTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card text-card-foreground">
      <table className="w-full text-sm" aria-busy={isLoading}>
        <caption className="sr-only">Serviços do tenant</caption>
        <thead className="bg-white/[0.02] text-[11px] tracking-[0.12em] text-fog/45 uppercase">
          <tr className="border-b text-left">
            <th scope="col" className="px-4 py-3 font-semibold">
              Serviço
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Preço
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Ações
            </th>
          </tr>
        </thead>

        <tbody className={cn(isLoading && services.length > 0 && 'opacity-60')}>
          {isLoading && services.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-fog/55">
                Carregando serviços…
              </td>
            </tr>
          ) : null}

          {!isLoading && services.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-fog/55">
                    {hasFilters
                      ? 'Nenhum serviço encontrado para os filtros informados.'
                      : 'Nenhum serviço cadastrado ainda.'}
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

          {services.map((service) => (
            <tr
              key={service.id}
              className="border-b transition-colors last:border-0 hover:bg-white/[0.02]"
            >
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-white">{service.name}</span>
                  {service.description ? (
                    <span className="line-clamp-1 text-xs text-fog/45">{service.description}</span>
                  ) : null}
                </div>
              </td>

              <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-white">
                {formatPrice(service.priceCents)}
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(service)}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDelete(service)}
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
