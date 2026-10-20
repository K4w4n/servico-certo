import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  GeneratedPasswordResetToken,
  PasswordResetTokenService,
} from '../../application/ports/password-reset-token-service.js';

const MINUTE_IN_MS = 60 * 1000;

@Injectable()
export class CryptoPasswordResetTokenService implements PasswordResetTokenService {
  private readonly ttlMinutes: number;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.ttlMinutes = Number(config.getOrThrow('PASSWORD_RESET_TOKEN_TTL_MINUTES'));
  }

  generate(now: Date): GeneratedPasswordResetToken {
    const token = randomBytes(32).toString('base64url');

    return {
      token,
      hash: this.hash(token),
      expiresAt: new Date(now.getTime() + this.ttlMinutes * MINUTE_IN_MS),
      expiresInMinutes: this.ttlMinutes,
    };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
