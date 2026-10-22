import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../../../shared/application/ports/unit-of-work.js';
import type { Account } from '../../domain/entities/account.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../../domain/repositories/account.repository.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository.js';
import type { AccountStatus } from '../../domain/value-objects/account-status.js';
import { AccountNotFoundError, CannotBlockSelfError } from '../errors/identity.errors.js';

export type UpdateAccountStatusCommand = {
  tenantId: string;
  accountId: string;
  status: AccountStatus;
  requestingAccountId: string;
};

@Injectable()
export class UpdateAccountStatusUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async execute(command: UpdateAccountStatusCommand): Promise<Account> {
    const now = this.clock.now();

    return this.uow.run(async () => {
      const account = await this.accounts.findById(command.accountId);

      if (!account || account.tenantId !== command.tenantId) {
        throw new AccountNotFoundError();
      }

      if (account.status === command.status) {
        return account;
      }

      if (command.status === 'BLOCKED') {
        if (account.id === command.requestingAccountId) {
          throw new CannotBlockSelfError();
        }

        account.block(now);
      } else {
        account.unblock(now);
      }

      await this.accounts.save(account);

      if (command.status === 'BLOCKED') {
        await this.refreshTokens.revokeAllForAccount(account.id, now);
      }

      return account;
    });
  }
}
