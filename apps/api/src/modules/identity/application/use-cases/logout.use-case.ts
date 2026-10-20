import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository.js';
import { REFRESH_TOKEN_SERVICE, type RefreshTokenService } from '../ports/refresh-token-service.js';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = this.refreshTokenService.hash(refreshToken);
    const current = await this.refreshTokens.findByHash(tokenHash);

    if (!current || current.isRevoked) {
      return;
    }

    await this.refreshTokens.revoke(current.id, this.clock.now(), null);
  }
}
