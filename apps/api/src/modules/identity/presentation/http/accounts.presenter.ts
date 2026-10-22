import type { ListAccountsResponse } from '@servico-certo/contracts';
import type { AccountListResult } from '../../domain/repositories/account.repository.js';
import { toAccountResponse } from './auth.presenter.js';

export function toListAccountsResponse(
  result: AccountListResult,
  pagination: { limit: number; offset: number },
): ListAccountsResponse {
  return {
    data: result.items.map(toAccountResponse),
    meta: {
      limit: pagination.limit,
      offset: pagination.offset,
      total: result.total,
    },
  };
}
