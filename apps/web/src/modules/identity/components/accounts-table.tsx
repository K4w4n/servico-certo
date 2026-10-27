'use client';

import type { Account, AccountStatus } from '@servico-certo/contracts';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

type AccountsTableProps = {
  accounts: Account[];
  currentAccountId: string;
  isLoading: boolean;
  hasFilters: boolean;
  onEdit: (account: Account) => void;
  onChangePassword: (account: Account) => void;
  onSendReset: (account: Account) => void;
  onToggleStatus: (account: Account) => void;
  onClearFilters: () => void;
};

function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'ACTIVE'
          ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
          : 'bg-destructive/10 text-destructive',
      )}
    >
      {status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
    </span>
  );
}

export function AccountsTable({
  accounts,
  currentAccountId,
  isLoading,
  hasFilters,
  onEdit,
  onChangePassword,
  onSendReset,
  onToggleStatus,
  onClearFilters,
}: AccountsTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card text-card-foreground">
      <table className="w-full text-sm" aria-busy={isLoading}>
        <caption className="sr-only">Usuários do tenant</caption>
        <thead className="bg-white/[0.02] text-[11px] tracking-[0.12em] text-fog/45 uppercase">
          <tr className="border-b text-left">
            <th scope="col" className="px-4 py-3 font-semibold">
              Usuário
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Ações
            </th>
          </tr>
        </thead>

        <tbody className={cn(isLoading && accounts.length > 0 && 'opacity-60')}>
          {isLoading && accounts.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-fog/55">
                Carregando usuários…
              </td>
            </tr>
          ) : null}

          {!isLoading && accounts.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-fog/55">
                    {hasFilters
                      ? 'Nenhum usuário encontrado para os filtros informados.'
                      : 'Nenhum usuário cadastrado ainda.'}
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

          {accounts.map((account) => {
            const isSelf = account.id === currentAccountId;
            const isActive = account.status === 'ACTIVE';

            return (
              <tr
                key={account.id}
                className="border-b transition-colors last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">
                      {account.name}
                      {isSelf ? (
                        <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                          você
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-fog/45">{account.email}</span>
                  </div>
                </td>

                <td className="px-4 py-3 align-top">
                  <StatusBadge status={account.status} />
                </td>

                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(account)}>
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onChangePassword(account)}>
                      Alterar senha
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSendReset(account)}
                      disabled={!isActive}
                      title={
                        isActive
                          ? 'Enviar link de redefinição de senha por e-mail'
                          : 'Desbloqueie a conta antes de enviar o reset'
                      }
                    >
                      Enviar reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={
                        isActive
                          ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                          : undefined
                      }
                      onClick={() => onToggleStatus(account)}
                      disabled={isSelf && isActive}
                      title={
                        isSelf && isActive ? 'Você não pode bloquear sua própria conta' : undefined
                      }
                    >
                      {isActive ? 'Bloquear' : 'Desbloquear'}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
