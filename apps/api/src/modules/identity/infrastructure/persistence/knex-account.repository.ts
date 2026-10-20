import { Inject, Injectable } from '@nestjs/common';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import type { Account } from '../../domain/entities/account.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';
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

  async save(account: Account): Promise<void> {
    await this.uow
      .executor('accounts')
      .insert(accountMapper.toPersistence(account))
      .onConflict('id')
      .merge();
  }
}
