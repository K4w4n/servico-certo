import type { Product } from '../entities/product.js';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export type ProductListFilters = {
  tenantId: string;
  limit: number;
  offset: number;
  name?: string;
};

export type ProductListResult = {
  items: Product[];
  total: number;
};

export interface ProductRepository {
  findById(tenantId: string, id: string): Promise<Product | null>;
  findByIds(tenantId: string, ids: string[]): Promise<Product[]>;
  list(filters: ProductListFilters): Promise<ProductListResult>;
  save(product: Product): Promise<void>;
  softDelete(tenantId: string, id: string, deletedAt: Date): Promise<boolean>;
}
