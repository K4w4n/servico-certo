'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ListProductsResponse, Product } from '@servico-certo/contracts';
import { ConfirmDialog } from '@/modules/identity/components/confirm-dialog';
import { useAuth } from '@/modules/identity/providers/auth-provider';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { ProductFormDialog } from './product-form-dialog';
import { ProductsFilters, type ProductFiltersValues } from './products-filters';
import { ProductsTable } from './products-table';
import { deleteProduct, listProducts } from '../lib/products-api';
import { getProductErrorMessage } from '../lib/product-errors';

const PAGE_SIZE = 20;

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; product: Product }
  | { type: 'delete'; product: Product }
  | null;

type Feedback = {
  variant: 'success' | 'destructive';
  message: string;
};

const EMPTY_FILTERS: ProductFiltersValues = {
  name: '',
};

export function ProductsScreen() {
  const { request } = useAuth();
  const [draftFilters, setDraftFilters] = useState<ProductFiltersValues>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<ProductFiltersValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ListProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setListError(null);

    listProducts(request, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...(filters.name ? { name: filters.name } : {}),
    })
      .then((response) => {
        if (isActive) {
          setResult(response);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setListError(getProductErrorMessage(error, 'Não foi possível carregar os produtos.'));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [filters, page, reloadKey, request]);

  const products = result?.data ?? [];
  const meta = result?.meta ?? { limit: PAGE_SIZE, offset: 0, total: 0 };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit));
  const currentPage = Math.floor(meta.offset / meta.limit) + 1;
  const firstItem = meta.total === 0 ? 0 : meta.offset + 1;
  const lastItem = meta.offset + products.length;
  const hasFilters = Boolean(filters.name);

  function applyFilters() {
    setFeedback(null);
    setPage(0);
    setFilters({ name: draftFilters.name.trim() });
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(0);
    setFeedback(null);
  }

  function reload() {
    setReloadKey((current) => current + 1);
  }

  function handleSaved(_product: Product) {
    const mode = dialog?.type;

    setDialog(null);
    setFeedback({
      variant: 'success',
      message:
        mode === 'create' ? 'Produto criado com sucesso.' : 'Produto atualizado com sucesso.',
    });

    if (mode === 'create') {
      setPage(0);
    }

    reload();
  }

  function openDeleteDialog(product: Product) {
    setDeleteError(null);
    setDialog({ type: 'delete', product });
  }

  async function handleDeleteConfirm() {
    if (dialog?.type !== 'delete' || isDeleting) {
      return;
    }

    const target = dialog.product;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteProduct(request, target.id);

      setDialog(null);
      setFeedback({
        variant: 'success',
        message: `Produto ${target.name} excluído.`,
      });

      if ((result?.data.length ?? 0) === 1 && page > 0) {
        setPage(page - 1);
      } else {
        reload();
      }
    } catch (error) {
      setDeleteError(getProductErrorMessage(error, 'Não foi possível excluir o produto.'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
            <span className="size-1.5 rounded-full bg-brand" />
            Catálogo
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Produtos</h1>
          <p className="text-sm text-fog/55">Gerencie os produtos do tenant.</p>
        </div>

        <Button variant="brand" onClick={() => setDialog({ type: 'create' })}>
          <Plus aria-hidden="true" />
          Novo produto
        </Button>
      </div>

      <ProductsFilters
        values={draftFilters}
        onChange={setDraftFilters}
        onSubmit={applyFilters}
        onClear={clearFilters}
      />

      {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

      {listError ? (
        <Alert variant="destructive">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{listError}</span>
            <Button variant="outline" size="sm" onClick={reload}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      ) : null}

      <ProductsTable
        products={products}
        isLoading={isLoading}
        hasFilters={hasFilters}
        onEdit={(product) => setDialog({ type: 'edit', product })}
        onDelete={openDeleteDialog}
        onClearFilters={clearFilters}
      />

      <div className="flex flex-col gap-3 px-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-fog/55">
          {isLoading && !result
            ? 'Carregando produtos…'
            : meta.total === 0
              ? 'Nenhum produto'
              : `Mostrando ${firstItem}–${lastItem} de ${meta.total} produto${meta.total === 1 ? '' : 's'}`}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0 || isLoading}
          >
            Anterior
          </Button>
          <span className="text-fog/55">
            Página {currentPage} de {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => current + 1)}
            disabled={page + 1 >= pageCount || isLoading}
          >
            Próxima
          </Button>
        </div>
      </div>

      {dialog?.type === 'create' ? (
        <ProductFormDialog
          mode="create"
          request={request}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'edit' ? (
        <ProductFormDialog
          mode="edit"
          product={dialog.product}
          request={request}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'delete' ? (
        <ConfirmDialog
          title="Excluir produto?"
          description={`${dialog.product.name} será removido da lista e não poderá ser usado em novas ordens de serviço.`}
          confirmLabel="Excluir"
          confirmVariant="destructive"
          isLoading={isDeleting}
          error={deleteError}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            if (!isDeleting) {
              setDialog(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
