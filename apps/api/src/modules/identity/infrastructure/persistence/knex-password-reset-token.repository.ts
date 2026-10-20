import { Inject, Injectable } from '@nestjs/common';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import type { PasswordResetToken } from '../../domain/entities/password-reset-token.js';
import type { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository.js';
import {
  passwordResetTokenMapper,
  type PasswordResetTokenRow,
} from '../persistence/password-reset-token.mapper.js';

@Injectable()
export class KnexPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(@Inject(KnexUnitOfWork) private readonly uow: KnexUnitOfWork) {}

  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const row = (await this.uow
      .executor('password_reset_tokens')
      .where({ token_hash: tokenHash })
      .first()) as PasswordResetTokenRow | undefined;

    return row ? passwordResetTokenMapper.toDomain(row) : null;
  }

  async save(token: PasswordResetToken): Promise<void> {
    await this.uow
      .executor('password_reset_tokens')
      .insert(passwordResetTokenMapper.toPersistence(token));
  }

  async markUsed(id: string, usedAt: Date): Promise<boolean> {
    const updated = await this.uow
      .executor('password_reset_tokens')
      .where({ id })
      .whereNull('used_at')
      .whereNull('revoked_at')
      .update({ used_at: usedAt });

    return updated > 0;
  }

  async invalidateAllForAccount(accountId: string, revokedAt: Date): Promise<void> {
    await this.uow
      .executor('password_reset_tokens')
      .where({ account_id: accountId })
      .whereNull('used_at')
      .whereNull('revoked_at')
      .update({ revoked_at: revokedAt });
  }
}
