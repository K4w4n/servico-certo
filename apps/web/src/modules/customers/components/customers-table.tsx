'use client';

import type { Customer } from '@servico-certo/contracts';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { formatDocument, formatPhoneNumber } from '../lib/customer-format';

type CustomersTableProps = {
  customers: Customer[];
  isLoading: boolean;
  hasFilters: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onClearFilters: () => void;
};

export function CustomersTable({
  customers,
  isLoading,
  hasFilters,
  onEdit,
  onDelete,
  onClearFilters,
}: CustomersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card text-card-foreground shadow-sm">
      <table className="w-full text-sm" aria-busy={isLoading}>
        <caption className="sr-only">Clientes do tenant</caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="px-4 py-3 font-medium">
              Cliente
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Documento
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Telefone
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Ações
            </th>
          </tr>
        </thead>

        <tbody className={cn(isLoading && customers.length > 0 && 'opacity-60')}>
          {isLoading && customers.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                Carregando clientes…
              </td>
            </tr>
          ) : null}

          {!isLoading && customers.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-muted-foreground">
                    {hasFilters
                      ? 'Nenhum cliente encontrado para os filtros informados.'
                      : 'Nenhum cliente cadastrado ainda.'}
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

          {customers.map((customer) => (
            <tr key={customer.id} className="border-b last:border-0">
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{customer.name}</span>
                  {customer.address ? (
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {customer.address}
                    </span>
                  ) : null}
                </div>
              </td>

              <td className="px-4 py-3">
                {customer.document && customer.documentType ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{customer.documentType}</span>
                    <span>{formatDocument(customer.document)}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>

              <td className="px-4 py-3">
                {customer.phoneNumber ? (
                  formatPhoneNumber(customer.phoneNumber)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(customer)}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDelete(customer)}
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
