import {
  customerSchema,
  listCustomersResponseSchema,
  type CreateCustomerInput,
  type Customer,
  type ListCustomersQuery,
  type ListCustomersResponse,
  type UpdateCustomerInput,
} from '@servico-certo/contracts';
import type { ApiClient } from '@/shared/lib/api-client';

type Request = ApiClient['fetch'];

function toQueryString(query: ListCustomersQuery): string {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
  });

  if (query.name) {
    params.set('name', query.name);
  }

  if (query.document) {
    params.set('document', query.document);
  }

  return params.toString();
}

export async function listCustomers(
  request: Request,
  query: ListCustomersQuery,
): Promise<ListCustomersResponse> {
  const payload = await request<unknown>(`/customers?${toQueryString(query)}`);

  return listCustomersResponseSchema.parse(payload);
}

export async function createCustomer(
  request: Request,
  input: CreateCustomerInput,
): Promise<Customer> {
  const payload = await request<unknown>('/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return customerSchema.parse(payload);
}

export async function updateCustomer(
  request: Request,
  customerId: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  const payload = await request<unknown>(`/customers/${encodeURIComponent(customerId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  return customerSchema.parse(payload);
}

export async function deleteCustomer(request: Request, customerId: string): Promise<void> {
  await request<void>(`/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
  });
}
