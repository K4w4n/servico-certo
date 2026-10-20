import { toDate, toNullableDate } from '../../../../shared/database/date.js';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.js';

export type PasswordResetTokenRow = {
  id: string;
  account_id: string;
  token_hash: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  revoked_at: Date | string | null;
  created_at: Date | string;
};

export const passwordResetTokenMapper = {
  toDomain(row: PasswordResetTokenRow): PasswordResetToken {
    return PasswordResetToken.restore({
      id: row.id,
      accountId: row.account_id,
      tokenHash: row.token_hash,
      expiresAt: toDate(row.expires_at),
      usedAt: toNullableDate(row.used_at),
      revokedAt: toNullableDate(row.revoked_at),
      createdAt: toDate(row.created_at),
    });
  },

  toPersistence(token: PasswordResetToken): PasswordResetTokenRow {
    return {
      id: token.id,
      account_id: token.accountId,
      token_hash: token.tokenHash,
      expires_at: token.expiresAt,
      used_at: token.usedAt,
      revoked_at: token.revokedAt,
      created_at: token.createdAt,
    };
  },
};
