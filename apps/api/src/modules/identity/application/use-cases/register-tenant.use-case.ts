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
import { isUniqueViolation } from '../../../../shared/database/unique-violation.js';
import { Account } from '../../domain/entities/account.js';
import { RefreshToken } from '../../domain/entities/refresh-token.js';
import { Tenant } from '../../domain/entities/tenant.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../../domain/repositories/account.repository.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository.js';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '../../domain/repositories/tenant.repository.js';
import { Email } from '../../domain/value-objects/email.js';
import { PasswordHash } from '../../domain/value-objects/password-hash.js';
import { TenantDomain } from '../../domain/value-objects/tenant-domain.js';
import {
  EmailAlreadyInUseError,
  TenantDomainAlreadyInUseError,
} from '../errors/identity.errors.js';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.js';
import { REFRESH_TOKEN_SERVICE, type RefreshTokenService } from '../ports/refresh-token-service.js';
import { TOKEN_ISSUER, type TokenIssuer } from '../ports/token-issuer.js';
import { assertPasswordStrength } from '../services/password-policy.js';
import type { AuthenticatedSession } from '../types/authenticated-session.js';

export type RegisterTenantCommand = {
  tenantName: string;
  tenantDomain: string;
  accountName: string;
  email: string;
  password: string;
};

@Injectable()
export class RegisterTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async execute(command: RegisterTenantCommand): Promise<AuthenticatedSession> {
    const domain = TenantDomain.create(command.tenantDomain);
    const email = Email.create(command.email);
    assertPasswordStrength(command.password);

    if (await this.tenants.existsByDomain(domain.value)) {
      throw new TenantDomainAlreadyInUseError();
    }

    const now = this.clock.now();
    const tenantId = this.ids.next();
    const accountId = this.ids.next();

    const tenant = Tenant.create({
      id: tenantId,
      name: command.tenantName,
      domain,
      now,
    });

    const account = Account.create({
      id: accountId,
      tenantId,
      name: command.accountName,
      email,
      passwordHash: PasswordHash.create(await this.passwordHasher.hash(command.password)),
      now,
    });

    const accessToken = await this.tokenIssuer.issue({ accountId, tenantId });
    const generatedRefreshToken = this.refreshTokenService.generate(now);

    const refreshToken = RefreshToken.create({
      id: this.ids.next(),
      accountId,
      familyId: this.ids.next(),
      tokenHash: generatedRefreshToken.hash,
      expiresAt: generatedRefreshToken.expiresAt,
      now,
    });

    try {
      await this.uow.run(async () => {
        await this.tenants.save(tenant);
        await this.accounts.save(account);
        await this.refreshTokens.save(refreshToken);
      });
    } catch (error) {
      if (isUniqueViolation(error, 'email')) {
        throw new EmailAlreadyInUseError();
      }

      if (isUniqueViolation(error)) {
        throw new TenantDomainAlreadyInUseError();
      }

      throw error;
    }

    return {
      accessToken: accessToken.token,
      expiresIn: accessToken.expiresIn,
      refreshToken: generatedRefreshToken.token,
      account,
      tenant,
    };
  }
}
