import { toDate, toNullableDate } from '../../../../shared/database/date.js';
import { Product } from '../../domain/entities/product.js';
import { Price } from '../../domain/value-objects/price.js';

export type ProductRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  price_cents: number | string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

export const productMapper = {
  toDomain(row: ProductRow): Product {
    return Product.restore({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      price: Price.fromCents(Number(row.price_cents)),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: toNullableDate(row.deleted_at),
    });
  },

  toPersistence(product: Product): ProductRow {
    return {
      id: product.id,
      tenant_id: product.tenantId,
      name: product.name,
      description: product.description,
      price_cents: product.price.cents,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
      deleted_at: product.deletedAt,
    };
  },
};
