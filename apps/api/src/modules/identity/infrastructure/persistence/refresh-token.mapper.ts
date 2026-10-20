import { toDate, toNullableDate } from '../../../../shared/database/date.js';
import { RefreshToken } from '../../domain/entities/refresh-token.js';

export type RefreshTokenRow = {
  id: string;
  account_id: string;
  family_id: string;
  token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  replaced_by_id: string | null;
  created_at: Date | string;
};

export const refreshTokenMapper = {
  toDomain(row: RefreshTokenRow): RefreshToken {
    return RefreshToken.restore({
      id: row.id,
      accountId: row.account_id,
      familyId: row.family_id,
      tokenHash: row.token_hash,
      expiresAt: toDate(row.expires_at),
      revokedAt: toNullableDate(row.revoked_at),
      replacedById: row.replaced_by_id,
      createdAt: toDate(row.created_at),
    });
  },

  toPersistence(token: RefreshToken): RefreshTokenRow {
    return {
      id: token.id,
      account_id: token.accountId,
      family_id: token.familyId,
      token_hash: token.tokenHash,
      expires_at: token.expiresAt,
      revoked_at: token.revokedAt,
      replaced_by_id: token.replacedById,
      created_at: token.createdAt,
    };
  },
};
