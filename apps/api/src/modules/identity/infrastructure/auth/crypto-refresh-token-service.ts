import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  GeneratedRefreshToken,
  RefreshTokenService,
} from '../../application/ports/refresh-token-service.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CryptoRefreshTokenService implements RefreshTokenService {
  private readonly ttlMs: number;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.ttlMs = Number(config.getOrThrow('REFRESH_TOKEN_TTL_DAYS')) * DAY_IN_MS;
  }

  generate(now: Date): GeneratedRefreshToken {
    const token = randomBytes(32).toString('base64url');

    return {
      token,
      hash: this.hash(token),
      expiresAt: new Date(now.getTime() + this.ttlMs),
    };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
