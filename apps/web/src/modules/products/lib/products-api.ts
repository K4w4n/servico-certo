import {
  listProductsResponseSchema,
  productSchema,
  type CreateProductInput,
  type ListProductsQuery,
  type ListProductsResponse,
  type Product,
  type UpdateProductInput,
} from '@servico-certo/contracts';
import type { ApiClient } from '@/shared/lib/api-client';

type Request = ApiClient['fetch'];

function toQueryString(query: ListProductsQuery): string {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
  });

  if (query.name) {
    params.set('name', query.name);
  }

  return params.toString();
}

export async function listProducts(
  request: Request,
  query: ListProductsQuery,
): Promise<ListProductsResponse> {
  const payload = await request<unknown>(`/products?${toQueryString(query)}`);

  return listProductsResponseSchema.parse(payload);
}

export async function createProduct(request: Request, input: CreateProductInput): Promise<Product> {
  const payload = await request<unknown>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return productSchema.parse(payload);
}

export async function updateProduct(
  request: Request,
  productId: string,
  input: UpdateProductInput,
): Promise<Product> {
  const payload = await request<unknown>(`/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  return productSchema.parse(payload);
}

export async function deleteProduct(request: Request, productId: string): Promise<void> {
  await request<void>(`/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
}
