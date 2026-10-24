import {
  listServiceOrdersResponseSchema,
  serviceOrderSchema,
  type CreateServiceOrderInput,
  type ListServiceOrdersQuery,
  type ListServiceOrdersResponse,
  type ServiceOrder,
  type UpdateServiceOrderInput,
} from '@servico-certo/contracts';
import type { ApiClient } from '@/shared/lib/api-client';

type Request = ApiClient['fetch'];

function toQueryString(query: ListServiceOrdersQuery): string {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
  });

  if (query.protocol) {
    params.set('protocol', query.protocol);
  }

  if (query.customerId) {
    params.set('customerId', query.customerId);
  }

  if (query.productId) {
    params.set('productId', query.productId);
  }

  if (query.serviceId) {
    params.set('serviceId', query.serviceId);
  }

  return params.toString();
}

export async function listServiceOrders(
  request: Request,
  query: ListServiceOrdersQuery,
): Promise<ListServiceOrdersResponse> {
  const payload = await request<unknown>(`/service-orders?${toQueryString(query)}`);

  return listServiceOrdersResponseSchema.parse(payload);
}

export async function createServiceOrder(
  request: Request,
  input: CreateServiceOrderInput,
): Promise<ServiceOrder> {
  const payload = await request<unknown>('/service-orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return serviceOrderSchema.parse(payload);
}

export async function updateServiceOrder(
  request: Request,
  serviceOrderId: string,
  input: UpdateServiceOrderInput,
): Promise<ServiceOrder> {
  const payload = await request<unknown>(`/service-orders/${encodeURIComponent(serviceOrderId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  return serviceOrderSchema.parse(payload);
}

export async function deleteServiceOrder(request: Request, serviceOrderId: string): Promise<void> {
  await request<void>(`/service-orders/${encodeURIComponent(serviceOrderId)}`, {
    method: 'DELETE',
  });
}
