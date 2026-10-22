import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../../../shared/application/ports/unit-of-work.js';
import { isUniqueViolation } from '../../../../shared/database/unique-violation.js';
import type { Account } from '../../domain/entities/account.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../../domain/repositories/account.repository.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository.js';
import { Email } from '../../domain/value-objects/email.js';
import { PasswordHash } from '../../domain/value-objects/password-hash.js';
import { AccountNotFoundError, EmailAlreadyInUseError } from '../errors/identity.errors.js';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.js';
import { assertPasswordStrength } from '../services/password-policy.js';

export type UpdateAccountCommand = {
  tenantId: string;
  accountId: string;
  name?: string;
  email?: string;
  password?: string;
};

@Injectable()
export class UpdateAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async execute(command: UpdateAccountCommand): Promise<Account> {
    if (command.password !== undefined) {
      assertPasswordStrength(command.password);
    }

    const passwordHash =
      command.password !== undefined
        ? PasswordHash.create(await this.passwordHasher.hash(command.password))
        : undefined;

    const now = this.clock.now();

    return this.uow.run(async () => {
      const account = await this.accounts.findById(command.accountId);

      if (!account || account.tenantId !== command.tenantId) {
        throw new AccountNotFoundError();
      }

      if (command.name !== undefined) {
        account.changeName(command.name, now);
      }

      if (command.email !== undefined) {
        const email = Email.create(command.email);

        if (!email.equals(account.email)) {
          const existingAccount = await this.accounts.findByTenantAndEmail(
            command.tenantId,
            email.value,
          );

          if (existingAccount && existingAccount.id !== account.id) {
            throw new EmailAlreadyInUseError();
          }

          account.changeEmail(email, now);
        }
      }

      if (passwordHash) {
        account.changePassword(passwordHash, now);
      }

      try {
        await this.accounts.save(account);
      } catch (error) {
        if (isUniqueViolation(error, 'email')) {
          throw new EmailAlreadyInUseError();
        }

        throw error;
      }

      if (passwordHash) {
        await this.refreshTokens.revokeAllForAccount(account.id, now);
      }

      return account;
    });
  }
}
