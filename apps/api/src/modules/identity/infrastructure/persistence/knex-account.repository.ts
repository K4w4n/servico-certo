import { Inject, Injectable } from '@nestjs/common';
import { escapeLike } from '../../../../shared/database/like.js';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import type { Account } from '../../domain/entities/account.js';
import type {
  AccountListFilters,
  AccountListResult,
  AccountRepository,
} from '../../domain/repositories/account.repository.js';
import { accountMapper, type AccountRow } from '../persistence/account.mapper.js';

@Injectable()
export class KnexAccountRepository implements AccountRepository {
  constructor(@Inject(KnexUnitOfWork) private readonly uow: KnexUnitOfWork) {}

  async findById(id: string): Promise<Account | null> {
    const row = (await this.uow.executor('accounts').where({ id }).first()) as
      AccountRow | undefined;

    return row ? accountMapper.toDomain(row) : null;
  }

  async findByTenantAndEmail(tenantId: string, email: string): Promise<Account | null> {
    const row = (await this.uow
      .executor('accounts')
      .where({ tenant_id: tenantId, email })
      .first()) as AccountRow | undefined;

    return row ? accountMapper.toDomain(row) : null;
  }

  async existsByTenantAndEmail(tenantId: string, email: string): Promise<boolean> {
    const row = await this.uow
      .executor('accounts')
      .select('id')
      .where({ tenant_id: tenantId, email })
      .first();

    return Boolean(row);
  }

  async list(filters: AccountListFilters): Promise<AccountListResult> {
    const query = this.uow.executor('accounts').where({ tenant_id: filters.tenantId });

    if (filters.name) {
      query.whereRaw("LOWER(name) LIKE ? ESCAPE '\\'", [
        `%${escapeLike(filters.name.toLowerCase())}%`,
      ]);
    }

    if (filters.email) {
      query.whereRaw("LOWER(email) LIKE ? ESCAPE '\\'", [
        `%${escapeLike(filters.email.toLowerCase())}%`,
      ]);
    }

    const countRow = (await query
      .clone()
      .count<{ count: string | number }>('id as count')
      .first()) as { count: string | number } | undefined;

    const rows = (await query
      .clone()
      .select('*')
      .orderByRaw('LOWER(name) ASC')
      .orderBy('id', 'asc')
      .limit(filters.limit)
      .offset(filters.offset)) as AccountRow[];

    return {
      items: rows.map((row) => accountMapper.toDomain(row)),
      total: Number(countRow?.count ?? 0),
    };
  }

  async save(account: Account): Promise<void> {
    await this.uow
      .executor('accounts')
      .insert(accountMapper.toPersistence(account))
      .onConflict('id')
      .merge();
  }
}
