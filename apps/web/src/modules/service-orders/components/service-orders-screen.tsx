'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ListServiceOrdersResponse, ServiceOrder } from '@servico-certo/contracts';
import { ConfirmDialog } from '@/modules/identity/components/confirm-dialog';
import { useAuth } from '@/modules/identity/providers/auth-provider';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { ServiceOrderDetailsDialog } from './service-order-details-dialog';
import { ServiceOrderFormDialog } from './service-order-form-dialog';
import { ServiceOrdersFilters, type ServiceOrderFiltersValues } from './service-orders-filters';
import { ServiceOrdersTable } from './service-orders-table';
import { getServiceOrderErrorMessage } from '../lib/service-order-errors';
import { deleteServiceOrder, listServiceOrders } from '../lib/service-orders-api';
import {
  loadServiceOrderReferences,
  type ServiceOrderReferences,
} from '../lib/service-order-references';

const PAGE_SIZE = 20;

const EMPTY_REFERENCES: ServiceOrderReferences = {
  customers: [],
  products: [],
  services: [],
};

const EMPTY_FILTERS: ServiceOrderFiltersValues = {
  protocol: '',
  customerId: '',
  productId: '',
  serviceId: '',
};

type DialogState =
  | { type: 'create' }
  | { type: 'details'; order: ServiceOrder }
  | { type: 'edit'; order: ServiceOrder }
  | { type: 'delete'; order: ServiceOrder }
  | null;

type Feedback = {
  variant: 'success' | 'destructive';
  message: string;
};

export function ServiceOrdersScreen() {
  const { request, download, tenant } = useAuth();
  const [draftFilters, setDraftFilters] = useState<ServiceOrderFiltersValues>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<ServiceOrderFiltersValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ListServiceOrdersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [references, setReferences] = useState<ServiceOrderReferences>(EMPTY_REFERENCES);
  const [isReferencesLoading, setIsReferencesLoading] = useState(true);
  const [referencesError, setReferencesError] = useState<string | null>(null);
  const [referencesReloadKey, setReferencesReloadKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    setIsReferencesLoading(true);
    setReferencesError(null);

    loadServiceOrderReferences(request)
      .then((data) => {
        if (isActive) {
          setReferences(data);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setReferencesError(
            getServiceOrderErrorMessage(
              error,
              'Não foi possível carregar clientes, produtos e serviços.',
            ),
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsReferencesLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [request, referencesReloadKey]);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setListError(null);

    listServiceOrders(request, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...(filters.protocol ? { protocol: filters.protocol } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    })
      .then((response) => {
        if (isActive) {
          setResult(response);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setListError(
            getServiceOrderErrorMessage(error, 'Não foi possível carregar as ordens de serviço.'),
          );
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

  const orders = result?.data ?? [];
  const meta = result?.meta ?? { limit: PAGE_SIZE, offset: 0, total: 0 };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit));
  const currentPage = Math.floor(meta.offset / meta.limit) + 1;
  const firstItem = meta.total === 0 ? 0 : meta.offset + 1;
  const lastItem = meta.offset + orders.length;
  const hasFilters = Boolean(
    filters.protocol || filters.customerId || filters.productId || filters.serviceId,
  );

  function applyFilters() {
    setFeedback(null);
    setPage(0);
    setFilters({
      protocol: draftFilters.protocol.trim(),
      customerId: draftFilters.customerId,
      productId: draftFilters.productId,
      serviceId: draftFilters.serviceId,
    });
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

  function reloadReferences() {
    setReferencesReloadKey((current) => current + 1);
  }

  function handleSaved(_order: ServiceOrder) {
    const mode = dialog?.type;

    setDialog(null);
    setFeedback({
      variant: 'success',
      message:
        mode === 'create'
          ? 'Ordem de serviço criada com sucesso.'
          : 'Ordem de serviço atualizada com sucesso.',
    });

    if (mode === 'create') {
      setPage(0);
    }

    reload();
  }

  function openDeleteDialog(order: ServiceOrder) {
    setDeleteError(null);
    setDialog({ type: 'delete', order });
  }

  async function handleDeleteConfirm() {
    if (dialog?.type !== 'delete' || isDeleting) {
      return;
    }

    const target = dialog.order;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteServiceOrder(request, target.id);

      setDialog(null);
      setFeedback({
        variant: 'success',
        message: `Ordem de serviço #${target.protocol} excluída.`,
      });

      if ((result?.data.length ?? 0) === 1 && page > 0) {
        setPage(page - 1);
      } else {
        reload();
      }
    } catch (error) {
      setDeleteError(
        getServiceOrderErrorMessage(error, 'Não foi possível excluir a ordem de serviço.'),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ordens de serviço</h1>
          <p className="text-sm text-muted-foreground">Gerencie as ordens de serviço do tenant.</p>
        </div>

        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus aria-hidden="true" />
          Nova ordem de serviço
        </Button>
      </div>

      {referencesError ? (
        <Alert variant="destructive">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{referencesError}</span>
            <Button variant="outline" size="sm" onClick={reloadReferences}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      ) : null}

      <ServiceOrdersFilters
        values={draftFilters}
        references={references}
        isReferencesLoading={isReferencesLoading}
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

      <ServiceOrdersTable
        orders={orders}
        isLoading={isLoading}
        hasFilters={hasFilters}
        onOpen={(order) => setDialog({ type: 'details', order })}
        onEdit={(order) => setDialog({ type: 'edit', order })}
        onDelete={openDeleteDialog}
        onClearFilters={clearFilters}
      />

      <div className="flex flex-col gap-3 px-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          {isLoading && !result
            ? 'Carregando ordens de serviço…'
            : meta.total === 0
              ? 'Nenhuma ordem de serviço'
              : `Mostrando ${firstItem}–${lastItem} de ${meta.total} ordem${meta.total === 1 ? '' : 's'} de serviço`}
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
          <span className="text-muted-foreground">
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
        <ServiceOrderFormDialog
          mode="create"
          request={request}
          references={references}
          isReferencesLoading={isReferencesLoading}
          referencesError={referencesError}
          onRetryReferences={reloadReferences}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'details' ? (
        <ServiceOrderDetailsDialog
          order={dialog.order}
          tenantName={tenant?.name ?? 'Serviço Certo'}
          download={download}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.type === 'edit' ? (
        <ServiceOrderFormDialog
          mode="edit"
          serviceOrder={dialog.order}
          request={request}
          references={references}
          isReferencesLoading={isReferencesLoading}
          referencesError={referencesError}
          onRetryReferences={reloadReferences}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'delete' ? (
        <ConfirmDialog
          title="Excluir ordem de serviço?"
          description={`A ordem #${dialog.order.protocol} de ${dialog.order.customer.name} será removida da lista e não poderá mais ser editada.`}
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
