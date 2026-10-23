import { Inject, Injectable } from '@nestjs/common';
import { escapeLike } from '../../../../shared/database/like.js';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import type { Service } from '../../domain/entities/service.js';
import type {
  ServiceListFilters,
  ServiceListResult,
  ServiceRepository,
} from '../../domain/repositories/service.repository.js';
import { serviceMapper, type ServiceRow } from './service.mapper.js';

@Injectable()
export class KnexServiceRepository implements ServiceRepository {
  constructor(@Inject(KnexUnitOfWork) private readonly uow: KnexUnitOfWork) {}

  async findById(tenantId: string, id: string): Promise<Service | null> {
    const row = (await this.uow
      .executor('services')
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .first()) as ServiceRow | undefined;

    return row ? serviceMapper.toDomain(row) : null;
  }

  async list(filters: ServiceListFilters): Promise<ServiceListResult> {
    const query = this.uow
      .executor('services')
      .where({ tenant_id: filters.tenantId })
      .whereNull('deleted_at');

    if (filters.name) {
      query.whereRaw("LOWER(name) LIKE ? ESCAPE '\\'", [
        `%${escapeLike(filters.name.toLowerCase())}%`,
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
      .offset(filters.offset)) as ServiceRow[];

    return {
      items: rows.map((row) => serviceMapper.toDomain(row)),
      total: Number(countRow?.count ?? 0),
    };
  }

  async save(service: Service): Promise<void> {
    await this.uow
      .executor('services')
      .insert(serviceMapper.toPersistence(service))
      .onConflict('id')
      .merge();
  }

  async softDelete(tenantId: string, id: string, deletedAt: Date): Promise<boolean> {
    const updated = await this.uow
      .executor('services')
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
      });

    return updated > 0;
  }
}
