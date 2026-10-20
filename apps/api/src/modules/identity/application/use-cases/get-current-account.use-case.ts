import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../../domain/repositories/account.repository.js';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '../../domain/repositories/tenant.repository.js';
import { UnauthorizedError } from '../errors/identity.errors.js';
import type { CurrentAccountResult } from '../types/authenticated-session.js';

export type GetCurrentAccountCommand = {
  accountId: string;
  tenantId: string;
};

@Injectable()
export class GetCurrentAccountUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(command: GetCurrentAccountCommand): Promise<CurrentAccountResult> {
    const account = await this.accounts.findById(command.accountId);

    if (!account || account.tenantId !== command.tenantId) {
      throw new UnauthorizedError();
    }

    const tenant = await this.tenants.findById(command.tenantId);

    if (!tenant) {
      throw new UnauthorizedError();
    }

    return { account, tenant };
  }
}
