import { Inject, Injectable } from '@nestjs/common';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import type { RefreshToken } from '../../domain/entities/refresh-token.js';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.js';
import { refreshTokenMapper, type RefreshTokenRow } from '../persistence/refresh-token.mapper.js';

@Injectable()
export class KnexRefreshTokenRepository implements RefreshTokenRepository {
  constructor(@Inject(KnexUnitOfWork) private readonly uow: KnexUnitOfWork) {}

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = (await this.uow
      .executor('refresh_tokens')
      .where({ token_hash: tokenHash })
      .first()) as RefreshTokenRow | undefined;

    return row ? refreshTokenMapper.toDomain(row) : null;
  }

  async save(token: RefreshToken): Promise<void> {
    await this.uow.executor('refresh_tokens').insert(refreshTokenMapper.toPersistence(token));
  }

  async revoke(id: string, revokedAt: Date, replacedById: string | null): Promise<boolean> {
    const updated = await this.uow
      .executor('refresh_tokens')
      .where({ id })
      .whereNull('revoked_at')
      .update({
        revoked_at: revokedAt,
        replaced_by_id: replacedById,
      });

    return updated > 0;
  }

  async revokeFamily(familyId: string, revokedAt: Date): Promise<void> {
    await this.uow
      .executor('refresh_tokens')
      .where({ family_id: familyId })
      .whereNull('revoked_at')
      .update({ revoked_at: revokedAt });
  }

  async revokeAllForAccount(accountId: string, revokedAt: Date): Promise<void> {
    await this.uow
      .executor('refresh_tokens')
      .where({ account_id: accountId })
      .whereNull('revoked_at')
      .update({ revoked_at: revokedAt });
  }
}
