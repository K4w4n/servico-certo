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
import { RefreshToken } from '../../domain/entities/refresh-token.js';
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
import { InvalidRefreshTokenError } from '../errors/identity.errors.js';
import { REFRESH_TOKEN_SERVICE, type RefreshTokenService } from '../ports/refresh-token-service.js';
import { TOKEN_ISSUER, type TokenIssuer } from '../ports/token-issuer.js';
import type { AuthenticatedSession } from '../types/authenticated-session.js';

export type RefreshSessionCommand = {
  refreshToken?: string;
};

type RefreshSessionResult = { status: 'ok'; session: AuthenticatedSession } | { status: 'invalid' };

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<AuthenticatedSession> {
    if (!command.refreshToken) {
      throw new InvalidRefreshTokenError();
    }

    const tokenHash = this.refreshTokenService.hash(command.refreshToken);

    const result = await this.uow.run<RefreshSessionResult>(async () => {
      const current = await this.refreshTokens.findByHash(tokenHash);

      if (!current) {
        return { status: 'invalid' };
      }

      const now = this.clock.now();

      if (current.isRevoked || current.isExpired(now)) {
        await this.refreshTokens.revokeFamily(current.familyId, now);
        return { status: 'invalid' };
      }

      const account = await this.accounts.findById(current.accountId);

      if (!account) {
        await this.refreshTokens.revokeFamily(current.familyId, now);
        return { status: 'invalid' };
      }

      if (account.isBlocked) {
        await this.refreshTokens.revokeFamily(current.familyId, now);
        return { status: 'invalid' };
      }

      const tenant = await this.tenants.findById(account.tenantId);

      if (!tenant) {
        await this.refreshTokens.revokeFamily(current.familyId, now);
        return { status: 'invalid' };
      }

      const generatedRefreshToken = this.refreshTokenService.generate(now);
      const nextTokenId = this.ids.next();

      const revoked = await this.refreshTokens.revoke(current.id, now, nextTokenId);

      if (!revoked) {
        await this.refreshTokens.revokeFamily(current.familyId, now);
        return { status: 'invalid' };
      }

      const nextRefreshToken = RefreshToken.create({
        id: nextTokenId,
        accountId: account.id,
        familyId: current.familyId,
        tokenHash: generatedRefreshToken.hash,
        expiresAt: generatedRefreshToken.expiresAt,
        now,
      });

      await this.refreshTokens.save(nextRefreshToken);

      const accessToken = await this.tokenIssuer.issue({
        accountId: account.id,
        tenantId: tenant.id,
      });

      return {
        status: 'ok',
        session: {
          accessToken: accessToken.token,
          expiresIn: accessToken.expiresIn,
          refreshToken: generatedRefreshToken.token,
          account,
          tenant,
        },
      };
    });

    if (result.status === 'invalid') {
      throw new InvalidRefreshTokenError();
    }

    return result.session;
  }
}
