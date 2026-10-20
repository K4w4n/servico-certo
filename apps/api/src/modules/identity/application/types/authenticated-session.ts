import type { Account } from '../../domain/entities/account.js';
import type { Tenant } from '../../domain/entities/tenant.js';

export type AuthenticatedSession = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  account: Account;
  tenant: Tenant;
};

export type CurrentAccountResult = {
  account: Account;
  tenant: Tenant;
};
