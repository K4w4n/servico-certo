'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Customer, ListCustomersResponse } from '@servico-certo/contracts';
import { ConfirmDialog } from '@/modules/identity/components/confirm-dialog';
import { useAuth } from '@/modules/identity/providers/auth-provider';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { CustomerFormDialog } from './customer-form-dialog';
import { CustomersFilters, type CustomerFiltersValues } from './customers-filters';
import { CustomersTable } from './customers-table';
import { deleteCustomer, listCustomers } from '../lib/customers-api';
import { getCustomerErrorMessage } from '../lib/customer-errors';
import { normalizeDocument } from '../lib/customer-format';

const PAGE_SIZE = 20;

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; customer: Customer }
  | { type: 'delete'; customer: Customer }
  | null;

type Feedback = {
  variant: 'success' | 'destructive';
  message: string;
};

const EMPTY_FILTERS: CustomerFiltersValues = {
  name: '',
  document: '',
};

export function CustomersScreen() {
  const { request } = useAuth();
  const [draftFilters, setDraftFilters] = useState<CustomerFiltersValues>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<CustomerFiltersValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ListCustomersResponse | null>(null);
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

    listCustomers(request, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...(filters.name ? { name: filters.name } : {}),
      ...(filters.document ? { document: filters.document } : {}),
    })
      .then((response) => {
        if (isActive) {
          setResult(response);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setListError(getCustomerErrorMessage(error, 'Não foi possível carregar os clientes.'));
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

  const customers = result?.data ?? [];
  const meta = result?.meta ?? { limit: PAGE_SIZE, offset: 0, total: 0 };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit));
  const currentPage = Math.floor(meta.offset / meta.limit) + 1;
  const firstItem = meta.total === 0 ? 0 : meta.offset + 1;
  const lastItem = meta.offset + customers.length;
  const hasFilters = Boolean(filters.name || filters.document);

  function applyFilters() {
    setFeedback(null);
    setPage(0);
    setFilters({
      name: draftFilters.name.trim(),
      document: normalizeDocument(draftFilters.document),
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

  function handleSaved(_customer: Customer) {
    const mode = dialog?.type;

    setDialog(null);
    setFeedback({
      variant: 'success',
      message:
        mode === 'create' ? 'Cliente criado com sucesso.' : 'Cliente atualizado com sucesso.',
    });

    if (mode === 'create') {
      setPage(0);
    }

    reload();
  }

  function openDeleteDialog(customer: Customer) {
    setDeleteError(null);
    setDialog({ type: 'delete', customer });
  }

  async function handleDeleteConfirm() {
    if (dialog?.type !== 'delete' || isDeleting) {
      return;
    }

    const target = dialog.customer;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteCustomer(request, target.id);

      setDialog(null);
      setFeedback({
        variant: 'success',
        message: `Cliente ${target.name} excluído.`,
      });

      if ((result?.data.length ?? 0) === 1 && page > 0) {
        setPage(page - 1);
      } else {
        reload();
      }
    } catch (error) {
      setDeleteError(getCustomerErrorMessage(error, 'Não foi possível excluir o cliente.'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie os clientes do tenant.</p>
        </div>

        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus aria-hidden="true" />
          Novo cliente
        </Button>
      </div>

      <CustomersFilters
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

      <CustomersTable
        customers={customers}
        isLoading={isLoading}
        hasFilters={hasFilters}
        onEdit={(customer) => setDialog({ type: 'edit', customer })}
        onDelete={openDeleteDialog}
        onClearFilters={clearFilters}
      />

      <div className="flex flex-col gap-3 px-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          {isLoading && !result
            ? 'Carregando clientes…'
            : meta.total === 0
              ? 'Nenhum cliente'
              : `Mostrando ${firstItem}–${lastItem} de ${meta.total} cliente${meta.total === 1 ? '' : 's'}`}
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
        <CustomerFormDialog
          mode="create"
          request={request}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'edit' ? (
        <CustomerFormDialog
          mode="edit"
          customer={dialog.customer}
          request={request}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'delete' ? (
        <ConfirmDialog
          title="Excluir cliente?"
          description={`${dialog.customer.name} será removido da lista e não poderá ser usado em novas ordens de serviço.`}
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
