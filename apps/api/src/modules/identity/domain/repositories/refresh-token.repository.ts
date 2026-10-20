import type { RefreshToken } from '../entities/refresh-token.js';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenRepository {
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  save(token: RefreshToken): Promise<void>;
  revoke(id: string, revokedAt: Date, replacedById: string | null): Promise<boolean>;
  revokeFamily(familyId: string, revokedAt: Date): Promise<void>;
  revokeAllForAccount(accountId: string, revokedAt: Date): Promise<void>;
}
