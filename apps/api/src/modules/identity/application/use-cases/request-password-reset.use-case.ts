import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../../shared/application/ports/id-generator.js';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../../../shared/application/ports/unit-of-work.js';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.js';
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
import { Email } from '../../domain/value-objects/email.js';
import { TenantDomain } from '../../domain/value-objects/tenant-domain.js';
import { MAILER, type Mailer } from '../ports/mailer.js';
import {
  PASSWORD_RESET_TOKEN_SERVICE,
  type PasswordResetTokenService,
} from '../ports/password-reset-token-service.js';

export type RequestPasswordResetCommand = {
  tenantDomain: string;
  email: string;
};

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(PASSWORD_RESET_TOKEN_SERVICE)
    private readonly tokenService: PasswordResetTokenService,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    let domain: TenantDomain;
    let email: Email;

    try {
      domain = TenantDomain.create(command.tenantDomain);
      email = Email.create(command.email);
    } catch {
      return;
    }

    const tenant = await this.tenants.findByDomain(domain.value);

    if (!tenant) {
      return;
    }

    const account = await this.accounts.findByTenantAndEmail(tenant.id, email.value);

    if (!account || account.isBlocked) {
      return;
    }

    const now = this.clock.now();
    const generatedToken = this.tokenService.generate(now);

    const passwordResetToken = PasswordResetToken.create({
      id: this.ids.next(),
      accountId: account.id,
      tokenHash: generatedToken.hash,
      expiresAt: generatedToken.expiresAt,
      now,
    });

    await this.uow.run(async () => {
      await this.resetTokens.invalidateAllForAccount(account.id, now);
      await this.resetTokens.save(passwordResetToken);
    });

    await this.mailer.sendPasswordReset({
      to: account.email.value,
      accountName: account.name,
      tenantName: tenant.name,
      token: generatedToken.token,
      expiresInMinutes: generatedToken.expiresInMinutes,
    });
  }
}
