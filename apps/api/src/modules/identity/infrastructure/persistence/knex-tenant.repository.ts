import { Inject, Injectable } from '@nestjs/common';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import type { Tenant } from '../../domain/entities/tenant.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import { tenantMapper, type TenantRow } from '../persistence/tenant.mapper.js';

@Injectable()
export class KnexTenantRepository implements TenantRepository {
  constructor(@Inject(KnexUnitOfWork) private readonly uow: KnexUnitOfWork) {}

  async findById(id: string): Promise<Tenant | null> {
    const row = (await this.uow.executor('tenants').where({ id }).first()) as TenantRow | undefined;

    return row ? tenantMapper.toDomain(row) : null;
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    const row = (await this.uow.executor('tenants').where({ domain }).first()) as
      TenantRow | undefined;

    return row ? tenantMapper.toDomain(row) : null;
  }

  async existsByDomain(domain: string): Promise<boolean> {
    const row = await this.uow.executor('tenants').select('id').where({ domain }).first();

    return Boolean(row);
  }

  async save(tenant: Tenant): Promise<void> {
    await this.uow
      .executor('tenants')
      .insert(tenantMapper.toPersistence(tenant))
      .onConflict('id')
      .merge();
  }
}
