import type { Account } from '../../domain/entities/account.js';
import type { Tenant } from '../../domain/entities/tenant.js';

export type PasswordResetContextResult = {
  account: Account;
  tenant: Tenant;
  expiresAt: Date;
};
