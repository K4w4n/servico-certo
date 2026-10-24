'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ListServicesResponse, Service } from '@servico-certo/contracts';
import { ConfirmDialog } from '@/modules/identity/components/confirm-dialog';
import { useAuth } from '@/modules/identity/providers/auth-provider';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { ServiceFormDialog } from './service-form-dialog';
import { ServicesFilters, type ServiceFiltersValues } from './services-filters';
import { ServicesTable } from './services-table';
import { deleteService, listServices } from '../lib/services-api';
import { getServiceErrorMessage } from '../lib/service-errors';

const PAGE_SIZE = 20;

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; service: Service }
  | { type: 'delete'; service: Service }
  | null;

type Feedback = {
  variant: 'success' | 'destructive';
  message: string;
};

const EMPTY_FILTERS: ServiceFiltersValues = {
  name: '',
};

export function ServicesScreen() {
  const { request } = useAuth();
  const [draftFilters, setDraftFilters] = useState<ServiceFiltersValues>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<ServiceFiltersValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ListServicesResponse | null>(null);
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

    listServices(request, {
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
          setListError(getServiceErrorMessage(error, 'Não foi possível carregar os serviços.'));
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

  const services = result?.data ?? [];
  const meta = result?.meta ?? { limit: PAGE_SIZE, offset: 0, total: 0 };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit));
  const currentPage = Math.floor(meta.offset / meta.limit) + 1;
  const firstItem = meta.total === 0 ? 0 : meta.offset + 1;
  const lastItem = meta.offset + services.length;
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

  function handleSaved(_service: Service) {
    const mode = dialog?.type;

    setDialog(null);
    setFeedback({
      variant: 'success',
      message:
        mode === 'create' ? 'Serviço criado com sucesso.' : 'Serviço atualizado com sucesso.',
    });

    if (mode === 'create') {
      setPage(0);
    }

    reload();
  }

  function openDeleteDialog(service: Service) {
    setDeleteError(null);
    setDialog({ type: 'delete', service });
  }

  async function handleDeleteConfirm() {
    if (dialog?.type !== 'delete' || isDeleting) {
      return;
    }

    const target = dialog.service;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteService(request, target.id);

      setDialog(null);
      setFeedback({
        variant: 'success',
        message: `Serviço ${target.name} excluído.`,
      });

      if ((result?.data.length ?? 0) === 1 && page > 0) {
        setPage(page - 1);
      } else {
        reload();
      }
    } catch (error) {
      setDeleteError(getServiceErrorMessage(error, 'Não foi possível excluir o serviço.'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">Gerencie os serviços do tenant.</p>
        </div>

        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus aria-hidden="true" />
          Novo serviço
        </Button>
      </div>

      <ServicesFilters
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

      <ServicesTable
        services={services}
        isLoading={isLoading}
        hasFilters={hasFilters}
        onEdit={(service) => setDialog({ type: 'edit', service })}
        onDelete={openDeleteDialog}
        onClearFilters={clearFilters}
      />

      <div className="flex flex-col gap-3 px-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          {isLoading && !result
            ? 'Carregando serviços…'
            : meta.total === 0
              ? 'Nenhum serviço'
              : `Mostrando ${firstItem}–${lastItem} de ${meta.total} serviço${meta.total === 1 ? '' : 's'}`}
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
        <ServiceFormDialog
          mode="create"
          request={request}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'edit' ? (
        <ServiceFormDialog
          mode="edit"
          service={dialog.service}
          request={request}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'delete' ? (
        <ConfirmDialog
          title="Excluir serviço?"
          description={`${dialog.service.name} será removido da lista e não poderá ser usado em novas ordens de serviço.`}
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
