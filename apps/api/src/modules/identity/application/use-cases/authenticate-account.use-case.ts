import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../../shared/application/ports/id-generator.js';
import type { Account } from '../../domain/entities/account.js';
import { RefreshToken } from '../../domain/entities/refresh-token.js';
import type { Tenant } from '../../domain/entities/tenant.js';
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
import { TenantDomain } from '../../domain/value-objects/tenant-domain.js';
import { InvalidCredentialsError } from '../errors/identity.errors.js';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.js';
import { REFRESH_TOKEN_SERVICE, type RefreshTokenService } from '../ports/refresh-token-service.js';
import { TOKEN_ISSUER, type TokenIssuer } from '../ports/token-issuer.js';
import type { AuthenticatedSession } from '../types/authenticated-session.js';

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$pKfAD9WPuCxpaf5MzTvL4A$DwFoSH72NpNG39kMxxV9tWlSyU7P5/RWcQThWVC+4iA';

export type AuthenticateAccountCommand = {
  tenantDomain: string;
  email: string;
  password: string;
};

@Injectable()
export class AuthenticateAccountUseCase {
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
  ) {}

  async execute(command: AuthenticateAccountCommand): Promise<AuthenticatedSession> {
    const credentials = this.parseCredentials(command);

    const tenant = await this.tenants.findByDomain(credentials.domain.value);

    if (!tenant) {
      await this.passwordHasher.verify(DUMMY_PASSWORD_HASH, command.password);
      throw new InvalidCredentialsError();
    }

    const account = await this.accounts.findByTenantAndEmail(tenant.id, credentials.email.value);

    if (!account) {
      await this.passwordHasher.verify(DUMMY_PASSWORD_HASH, command.password);
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(
      account.passwordHash.value,
      command.password,
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return this.createSession(account, tenant);
  }

  private parseCredentials(command: AuthenticateAccountCommand): {
    domain: TenantDomain;
    email: Email;
  } {
    try {
      return {
        domain: TenantDomain.create(command.tenantDomain),
        email: Email.create(command.email),
      };
    } catch {
      throw new InvalidCredentialsError();
    }
  }

  private async createSession(account: Account, tenant: Tenant): Promise<AuthenticatedSession> {
    const now = this.clock.now();
    const accessToken = await this.tokenIssuer.issue({
      accountId: account.id,
      tenantId: tenant.id,
    });
    const generatedRefreshToken = this.refreshTokenService.generate(now);

    const refreshToken = RefreshToken.create({
      id: this.ids.next(),
      accountId: account.id,
      familyId: this.ids.next(),
      tokenHash: generatedRefreshToken.hash,
      expiresAt: generatedRefreshToken.expiresAt,
      now,
    });

    await this.refreshTokens.save(refreshToken);

    return {
      accessToken: accessToken.token,
      expiresIn: accessToken.expiresIn,
      refreshToken: generatedRefreshToken.token,
      account,
      tenant,
    };
  }
}
