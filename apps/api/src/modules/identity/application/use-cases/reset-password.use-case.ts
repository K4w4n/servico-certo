import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../../../shared/application/ports/unit-of-work.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../../domain/repositories/account.repository.js';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type PasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository.js';
import { PasswordHash } from '../../domain/value-objects/password-hash.js';
import { InvalidResetTokenError } from '../errors/identity.errors.js';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.js';
import {
  PASSWORD_RESET_TOKEN_SERVICE,
  type PasswordResetTokenService,
} from '../ports/password-reset-token-service.js';
import { assertPasswordStrength } from '../services/password-policy.js';

export type ResetPasswordCommand = {
  token: string;
  password: string;
};

type ResetPasswordResult = { status: 'ok' } | { status: 'invalid' };

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(PASSWORD_RESET_TOKEN_SERVICE)
    private readonly tokenService: PasswordResetTokenService,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    assertPasswordStrength(command.password);

    const tokenHash = this.tokenService.hash(command.token);
    const now = this.clock.now();
    const existingToken = await this.resetTokens.findByHash(tokenHash);

    if (!existingToken || !existingToken.isUsable(now)) {
      throw new InvalidResetTokenError();
    }

    const passwordHash = PasswordHash.create(await this.passwordHasher.hash(command.password));

    const result = await this.uow.run<ResetPasswordResult>(async () => {
      const transactionNow = this.clock.now();
      const token = await this.resetTokens.findByHash(tokenHash);

      if (!token || !token.isUsable(transactionNow)) {
        return { status: 'invalid' };
      }

      const account = await this.accounts.findById(token.accountId);

      if (!account || account.isBlocked) {
        return { status: 'invalid' };
      }

      const markedAsUsed = await this.resetTokens.markUsed(token.id, transactionNow);

      if (!markedAsUsed) {
        return { status: 'invalid' };
      }

      account.changePassword(passwordHash, transactionNow);
      await this.accounts.save(account);
      await this.resetTokens.invalidateAllForAccount(account.id, transactionNow);
      await this.refreshTokens.revokeAllForAccount(account.id, transactionNow);

      return { status: 'ok' };
    });

    if (result.status === 'invalid') {
      throw new InvalidResetTokenError();
    }
  }
}
