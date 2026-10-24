'use client';

import type { Product } from '@servico-certo/contracts';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { formatPrice } from '@/shared/lib/price';

type ProductsTableProps = {
  products: Product[];
  isLoading: boolean;
  hasFilters: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onClearFilters: () => void;
};

export function ProductsTable({
  products,
  isLoading,
  hasFilters,
  onEdit,
  onDelete,
  onClearFilters,
}: ProductsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card text-card-foreground shadow-sm">
      <table className="w-full text-sm" aria-busy={isLoading}>
        <caption className="sr-only">Produtos do tenant</caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="px-4 py-3 font-medium">
              Produto
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Preço
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Ações
            </th>
          </tr>
        </thead>

        <tbody className={cn(isLoading && products.length > 0 && 'opacity-60')}>
          {isLoading && products.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                Carregando produtos…
              </td>
            </tr>
          ) : null}

          {!isLoading && products.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-muted-foreground">
                    {hasFilters
                      ? 'Nenhum produto encontrado para os filtros informados.'
                      : 'Nenhum produto cadastrado ainda.'}
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

          {products.map((product) => (
            <tr key={product.id} className="border-b last:border-0">
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{product.name}</span>
                  {product.description ? (
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {product.description}
                    </span>
                  ) : null}
                </div>
              </td>

              <td className="px-4 py-3 text-right whitespace-nowrap">
                {formatPrice(product.priceCents)}
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDelete(product)}
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
