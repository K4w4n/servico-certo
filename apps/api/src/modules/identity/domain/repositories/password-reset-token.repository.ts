import type { PasswordResetToken } from '../entities/password-reset-token.js';

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PASSWORD_RESET_TOKEN_REPOSITORY');

export interface PasswordResetTokenRepository {
  findByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  save(token: PasswordResetToken): Promise<void>;
  markUsed(id: string, usedAt: Date): Promise<boolean>;
  invalidateAllForAccount(accountId: string, revokedAt: Date): Promise<void>;
}
