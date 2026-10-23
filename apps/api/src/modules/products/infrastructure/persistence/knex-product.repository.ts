import { Inject, Injectable } from '@nestjs/common';
import { escapeLike } from '../../../../shared/database/like.js';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import type { Product } from '../../domain/entities/product.js';
import type {
  ProductListFilters,
  ProductListResult,
  ProductRepository,
} from '../../domain/repositories/product.repository.js';
import { productMapper, type ProductRow } from './product.mapper.js';

@Injectable()
export class KnexProductRepository implements ProductRepository {
  constructor(@Inject(KnexUnitOfWork) private readonly uow: KnexUnitOfWork) {}

  async findById(tenantId: string, id: string): Promise<Product | null> {
    const row = (await this.uow
      .executor('products')
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .first()) as ProductRow | undefined;

    return row ? productMapper.toDomain(row) : null;
  }

  async list(filters: ProductListFilters): Promise<ProductListResult> {
    const query = this.uow
      .executor('products')
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
      .offset(filters.offset)) as ProductRow[];

    return {
      items: rows.map((row) => productMapper.toDomain(row)),
      total: Number(countRow?.count ?? 0),
    };
  }

  async save(product: Product): Promise<void> {
    await this.uow
      .executor('products')
      .insert(productMapper.toPersistence(product))
      .onConflict('id')
      .merge();
  }

  async softDelete(tenantId: string, id: string, deletedAt: Date): Promise<boolean> {
    const updated = await this.uow
      .executor('products')
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
      });

    return updated > 0;
  }
}
