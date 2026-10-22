import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  type AccountListResult,
  type AccountRepository,
} from '../../domain/repositories/account.repository.js';

export type ListAccountsCommand = {
  tenantId: string;
  limit: number;
  offset: number;
  name?: string;
  email?: string;
};

@Injectable()
export class ListAccountsUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async execute(command: ListAccountsCommand): Promise<AccountListResult> {
    return this.accounts.list({
      tenantId: command.tenantId,
      limit: command.limit,
      offset: command.offset,
      ...(command.name ? { name: command.name } : {}),
      ...(command.email ? { email: command.email } : {}),
    });
  }
}
