'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Account, ListAccountsResponse } from '@servico-certo/contracts';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { useAuth } from '../providers/auth-provider';
import { listAccounts, updateAccountStatus } from '../lib/accounts-api';
import { getAccountErrorMessage } from '../lib/account-errors';
import { AccountFormDialog } from './account-form-dialog';
import { AccountPasswordDialog } from './account-password-dialog';
import { AccountsFilters, type AccountFiltersValues } from './accounts-filters';
import { AccountsTable } from './accounts-table';
import { ConfirmDialog } from './confirm-dialog';

const PAGE_SIZE = 20;

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; account: Account }
  | { type: 'password'; account: Account }
  | { type: 'status'; account: Account }
  | null;

type Feedback = {
  variant: 'success' | 'destructive';
  message: string;
};

const EMPTY_FILTERS: AccountFiltersValues = {
  name: '',
  email: '',
};

export function AccountsScreen() {
  const { account: currentAccount, request, updateAccount: syncSessionAccount } = useAuth();
  const [draftFilters, setDraftFilters] = useState<AccountFiltersValues>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<AccountFiltersValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ListAccountsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setListError(null);

    listAccounts(request, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...(filters.name ? { name: filters.name } : {}),
      ...(filters.email ? { email: filters.email } : {}),
    })
      .then((response) => {
        if (isActive) {
          setResult(response);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setListError(getAccountErrorMessage(error, 'Não foi possível carregar os usuários.'));
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

  if (!currentAccount) {
    return null;
  }

  const currentAccountId = currentAccount.id;

  const accounts = result?.data ?? [];
  const meta = result?.meta ?? { limit: PAGE_SIZE, offset: 0, total: 0 };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit));
  const currentPage = Math.floor(meta.offset / meta.limit) + 1;
  const firstItem = meta.total === 0 ? 0 : meta.offset + 1;
  const lastItem = meta.offset + accounts.length;
  const hasFilters = Boolean(filters.name || filters.email);

  function applyFilters() {
    setFeedback(null);
    setPage(0);
    setFilters({
      name: draftFilters.name.trim(),
      email: draftFilters.email.trim().toLowerCase(),
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

  function handleSaved(account: Account) {
    const mode = dialog?.type;

    setDialog(null);
    setFeedback({
      variant: 'success',
      message:
        mode === 'create' ? 'Usuário criado com sucesso.' : 'Usuário atualizado com sucesso.',
    });

    if (mode === 'edit' && account.id === currentAccountId) {
      syncSessionAccount(account);
    }

    if (mode === 'create') {
      setPage(0);
    }

    reload();
  }

  function handlePasswordChanged(account: Account) {
    setDialog(null);

    setFeedback({
      variant: 'success',
      message:
        account.id === currentAccountId
          ? 'Senha alterada. Sua sessão atual continuará ativa por alguns minutos. Depois, entre novamente com a nova senha.'
          : `Senha de ${account.name} alterada. O usuário precisará entrar novamente com a nova senha.`,
    });
  }

  function openStatusDialog(account: Account) {
    setStatusError(null);
    setDialog({ type: 'status', account });
  }

  async function handleStatusConfirm() {
    if (dialog?.type !== 'status' || isUpdatingStatus) {
      return;
    }

    const target = dialog.account;
    const nextStatus = target.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';

    setStatusError(null);
    setIsUpdatingStatus(true);

    try {
      const updated = await updateAccountStatus(request, target.id, { status: nextStatus });

      setResult((current) =>
        current
          ? {
              ...current,
              data: current.data.map((item) => (item.id === updated.id ? updated : item)),
            }
          : current,
      );
      setFeedback({
        variant: 'success',
        message:
          nextStatus === 'BLOCKED'
            ? 'Usuário bloqueado. O acesso foi encerrado.'
            : 'Usuário desbloqueado. Já pode entrar novamente.',
      });
      setDialog(null);
    } catch (error) {
      setStatusError(getAccountErrorMessage(error, 'Não foi possível alterar o status.'));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie as contas de acesso ao tenant.</p>
        </div>

        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus aria-hidden="true" />
          Novo usuário
        </Button>
      </div>

      <AccountsFilters
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

      <AccountsTable
        accounts={accounts}
        currentAccountId={currentAccountId}
        isLoading={isLoading}
        hasFilters={hasFilters}
        onEdit={(account) => setDialog({ type: 'edit', account })}
        onChangePassword={(account) => setDialog({ type: 'password', account })}
        onToggleStatus={openStatusDialog}
        onClearFilters={clearFilters}
      />

      <div className="flex flex-col gap-3 px-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          {isLoading && !result
            ? 'Carregando usuários…'
            : meta.total === 0
              ? 'Nenhum usuário'
              : `Mostrando ${firstItem}–${lastItem} de ${meta.total} usuário${meta.total === 1 ? '' : 's'}`}
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
        <AccountFormDialog
          mode="create"
          request={request}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'edit' ? (
        <AccountFormDialog
          mode="edit"
          account={dialog.account}
          request={request}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {dialog?.type === 'password' ? (
        <AccountPasswordDialog
          account={dialog.account}
          isSelf={dialog.account.id === currentAccountId}
          request={request}
          onClose={() => setDialog(null)}
          onChanged={handlePasswordChanged}
        />
      ) : null}

      {dialog?.type === 'status' ? (
        <ConfirmDialog
          title={dialog.account.status === 'ACTIVE' ? 'Bloquear usuário?' : 'Desbloquear usuário?'}
          description={
            dialog.account.status === 'ACTIVE'
              ? `${dialog.account.name} perderá o acesso imediatamente e as sessões serão encerradas.`
              : `${dialog.account.name} poderá entrar novamente no tenant.`
          }
          confirmLabel={dialog.account.status === 'ACTIVE' ? 'Bloquear' : 'Desbloquear'}
          confirmVariant={dialog.account.status === 'ACTIVE' ? 'destructive' : 'default'}
          isLoading={isUpdatingStatus}
          error={statusError}
          onConfirm={handleStatusConfirm}
          onClose={() => {
            if (!isUpdatingStatus) {
              setDialog(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
