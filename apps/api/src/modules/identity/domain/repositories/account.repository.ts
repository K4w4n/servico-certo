import type { Account } from '../entities/account.js';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface AccountRepository {
  findById(id: string): Promise<Account | null>;
  findByTenantAndEmail(tenantId: string, email: string): Promise<Account | null>;
  existsByTenantAndEmail(tenantId: string, email: string): Promise<boolean>;
  save(account: Account): Promise<void>;
}
