import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../../domain/repositories/account.repository.js';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type PasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository.js';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '../../domain/repositories/tenant.repository.js';
import { InvalidResetTokenError } from '../errors/identity.errors.js';
import {
  PASSWORD_RESET_TOKEN_SERVICE,
  type PasswordResetTokenService,
} from '../ports/password-reset-token-service.js';
import type { PasswordResetContextResult } from '../types/password-reset.js';

export type ValidatePasswordResetTokenCommand = {
  token: string;
};

@Injectable()
export class ValidatePasswordResetTokenUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(PASSWORD_RESET_TOKEN_SERVICE)
    private readonly tokenService: PasswordResetTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ValidatePasswordResetTokenCommand): Promise<PasswordResetContextResult> {
    const tokenHash = this.tokenService.hash(command.token);
    const token = await this.resetTokens.findByHash(tokenHash);

    if (!token || !token.isUsable(this.clock.now())) {
      throw new InvalidResetTokenError();
    }

    const account = await this.accounts.findById(token.accountId);

    if (!account) {
      throw new InvalidResetTokenError();
    }

    const tenant = await this.tenants.findById(account.tenantId);

    if (!tenant) {
      throw new InvalidResetTokenError();
    }

    return {
      account,
      tenant,
      expiresAt: token.expiresAt,
    };
  }
}
