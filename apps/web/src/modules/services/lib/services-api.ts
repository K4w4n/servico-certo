import {
  listServicesResponseSchema,
  serviceSchema,
  type CreateServiceInput,
  type ListServicesQuery,
  type ListServicesResponse,
  type Service,
  type UpdateServiceInput,
} from '@servico-certo/contracts';
import type { ApiClient } from '@/shared/lib/api-client';

type Request = ApiClient['fetch'];

function toQueryString(query: ListServicesQuery): string {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
  });

  if (query.name) {
    params.set('name', query.name);
  }

  return params.toString();
}

export async function listServices(
  request: Request,
  query: ListServicesQuery,
): Promise<ListServicesResponse> {
  const payload = await request<unknown>(`/services?${toQueryString(query)}`);

  return listServicesResponseSchema.parse(payload);
}

export async function createService(request: Request, input: CreateServiceInput): Promise<Service> {
  const payload = await request<unknown>('/services', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return serviceSchema.parse(payload);
}

export async function updateService(
  request: Request,
  serviceId: string,
  input: UpdateServiceInput,
): Promise<Service> {
  const payload = await request<unknown>(`/services/${encodeURIComponent(serviceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  return serviceSchema.parse(payload);
}

export async function deleteService(request: Request, serviceId: string): Promise<void> {
  await request<void>(`/services/${encodeURIComponent(serviceId)}`, {
    method: 'DELETE',
  });
}
