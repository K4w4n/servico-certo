import {
  accountSchema,
  listAccountsResponseSchema,
  type Account,
  type CreateAccountInput,
  type ListAccountsQuery,
  type ListAccountsResponse,
  type UpdateAccountInput,
  type UpdateAccountStatusInput,
} from '@servico-certo/contracts';
import type { ApiClient } from '@/shared/lib/api-client';

type Request = ApiClient['fetch'];

function toQueryString(query: ListAccountsQuery): string {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
  });

  if (query.name) {
    params.set('name', query.name);
  }

  if (query.email) {
    params.set('email', query.email);
  }

  return params.toString();
}

export async function listAccounts(
  request: Request,
  query: ListAccountsQuery,
): Promise<ListAccountsResponse> {
  const payload = await request<unknown>(`/accounts?${toQueryString(query)}`);

  return listAccountsResponseSchema.parse(payload);
}

export async function createAccount(request: Request, input: CreateAccountInput): Promise<Account> {
  const payload = await request<unknown>('/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return accountSchema.parse(payload);
}

export async function updateAccount(
  request: Request,
  accountId: string,
  input: UpdateAccountInput,
): Promise<Account> {
  const payload = await request<unknown>(`/accounts/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  return accountSchema.parse(payload);
}

export async function updateAccountStatus(
  request: Request,
  accountId: string,
  input: UpdateAccountStatusInput,
): Promise<Account> {
  const payload = await request<unknown>(`/accounts/${encodeURIComponent(accountId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  return accountSchema.parse(payload);
}
