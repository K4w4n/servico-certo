import type { Account } from '../entities/account.js';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export type AccountListFilters = {
  tenantId: string;
  limit: number;
  offset: number;
  name?: string;
  email?: string;
};

export type AccountListResult = {
  items: Account[];
  total: number;
};

export interface AccountRepository {
  findById(id: string): Promise<Account | null>;
  findByTenantAndEmail(tenantId: string, email: string): Promise<Account | null>;
  existsByTenantAndEmail(tenantId: string, email: string): Promise<boolean>;
  list(filters: AccountListFilters): Promise<AccountListResult>;
  save(account: Account): Promise<void>;
}
