import {
  PUBLIC_ID_PREFIXES,
  type ListProductsResponse,
  type Product as ProductResponse,
} from '@servico-certo/contracts';
import { encodePublicId } from '../../../../shared/ids/public-id.js';
import type { Product } from '../../domain/entities/product.js';
import type { ProductListResult } from '../../domain/repositories/product.repository.js';

export function toProductResponse(product: Product): ProductResponse {
  return {
    id: encodePublicId(PUBLIC_ID_PREFIXES.product, product.id),
    name: product.name,
    description: product.description,
    priceCents: product.price.cents,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toListProductsResponse(
  result: ProductListResult,
  pagination: { limit: number; offset: number },
): ListProductsResponse {
  return {
    data: result.items.map(toProductResponse),
    meta: {
      limit: pagination.limit,
      offset: pagination.offset,
      total: result.total,
    },
  };
}
