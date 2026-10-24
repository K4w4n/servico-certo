import type { Request } from 'express';

export type AuthenticatedAccount = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  account?: AuthenticatedAccount;
};
