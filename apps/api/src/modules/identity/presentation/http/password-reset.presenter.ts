import type { PasswordResetContext } from '@servico-certo/contracts';
import type { PasswordResetContextResult } from '../../application/types/password-reset.js';
import { toAccountResponse, toTenantResponse } from './auth.presenter.js';

export function toPasswordResetContextResponse(
  context: PasswordResetContextResult,
): PasswordResetContext {
  return {
    account: toAccountResponse(context.account),
    tenant: toTenantResponse(context.tenant),
    expiresAt: context.expiresAt.toISOString(),
  };
}
