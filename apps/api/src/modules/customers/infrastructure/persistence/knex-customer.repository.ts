import { Inject, Injectable } from '@nestjs/common';
import { escapeLike } from '../../../../shared/database/like.js';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import type { Customer } from '../../domain/entities/customer.js';
import type {
  CustomerListFilters,
  CustomerListResult,
  CustomerRepository,
} from '../../domain/repositories/customer.repository.js';
import { customerMapper, type CustomerRow } from './customer.mapper.js';

@Injectable()
export class KnexCustomerRepository implements CustomerRepository {
  constructor(@Inject(KnexUnitOfWork) private readonly uow: KnexUnitOfWork) {}

  async findById(tenantId: string, id: string): Promise<Customer | null> {
    const row = (await this.uow
      .executor('customers')
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .first()) as CustomerRow | undefined;

    return row ? customerMapper.toDomain(row) : null;
  }

  async findByDocument(tenantId: string, document: string): Promise<Customer | null> {
    const row = (await this.uow
      .executor('customers')
      .where({ tenant_id: tenantId, document })
      .whereNull('deleted_at')
      .first()) as CustomerRow | undefined;

    return row ? customerMapper.toDomain(row) : null;
  }

  async list(filters: CustomerListFilters): Promise<CustomerListResult> {
    const query = this.uow
      .executor('customers')
      .where({ tenant_id: filters.tenantId })
      .whereNull('deleted_at');

    if (filters.name) {
      query.whereRaw("LOWER(name) LIKE ? ESCAPE '\\'", [
        `%${escapeLike(filters.name.toLowerCase())}%`,
      ]);
    }

    if (filters.document) {
      query.whereRaw("document LIKE ? ESCAPE '\\'", [`%${escapeLike(filters.document)}%`]);
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
      .offset(filters.offset)) as CustomerRow[];

    return {
      items: rows.map((row) => customerMapper.toDomain(row)),
      total: Number(countRow?.count ?? 0),
    };
  }

  async save(customer: Customer): Promise<void> {
    await this.uow
      .executor('customers')
      .insert(customerMapper.toPersistence(customer))
      .onConflict('id')
      .merge();
  }

  async softDelete(tenantId: string, id: string, deletedAt: Date): Promise<boolean> {
    const updated = await this.uow
      .executor('customers')
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
      });

    return updated > 0;
  }
}
