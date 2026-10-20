import type { Request } from 'express';

export type AuthenticatedAccount = {
  id: string;
  tenantId: string;
};

export type AuthenticatedRequest = Request & {
  account?: AuthenticatedAccount;
};
