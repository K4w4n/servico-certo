import {
  PUBLIC_ID_PREFIXES,
  type Account as AccountResponse,
  type AuthResponse,
  type CurrentAccountResponse,
  type Tenant as TenantResponse,
} from '@servico-certo/contracts';
import { encodePublicId } from '../../../../shared/ids/public-id.js';
import type { Account } from '../../domain/entities/account.js';
import type { Tenant } from '../../domain/entities/tenant.js';
import type {
  AuthenticatedSession,
  CurrentAccountResult,
} from '../../application/types/authenticated-session.js';

export function toAccountResponse(account: Account): AccountResponse {
  return {
    id: encodePublicId(PUBLIC_ID_PREFIXES.account, account.id),
    name: account.name,
    email: account.email.value,
  };
}

export function toTenantResponse(tenant: Tenant): TenantResponse {
  return {
    id: encodePublicId(PUBLIC_ID_PREFIXES.tenant, tenant.id),
    name: tenant.name,
    domain: tenant.domain.value,
  };
}

export function toAuthResponse(session: AuthenticatedSession): AuthResponse {
  return {
    accessToken: session.accessToken,
    tokenType: 'Bearer',
    expiresIn: session.expiresIn,
    account: toAccountResponse(session.account),
    tenant: toTenantResponse(session.tenant),
  };
}

export function toCurrentAccountResponse(result: CurrentAccountResult): CurrentAccountResponse {
  return {
    account: toAccountResponse(result.account),
    tenant: toTenantResponse(result.tenant),
  };
}
