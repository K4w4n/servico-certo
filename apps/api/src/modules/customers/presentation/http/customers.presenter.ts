import {
  PUBLIC_ID_PREFIXES,
  type Customer as CustomerResponse,
  type ListCustomersResponse,
} from '@servico-certo/contracts';
import { encodePublicId } from '../../../../shared/ids/public-id.js';
import type { Customer } from '../../domain/entities/customer.js';
import type { CustomerListResult } from '../../domain/repositories/customer.repository.js';

export function toCustomerResponse(customer: Customer): CustomerResponse {
  return {
    id: encodePublicId(PUBLIC_ID_PREFIXES.customer, customer.id),
    name: customer.name,
    address: customer.address,
    document: customer.document?.value ?? null,
    documentType: customer.document?.type ?? null,
    phoneNumber: customer.phoneNumber?.value ?? null,
  };
}

export function toListCustomersResponse(
  result: CustomerListResult,
  pagination: { limit: number; offset: number },
): ListCustomersResponse {
  return {
    data: result.items.map(toCustomerResponse),
    meta: {
      limit: pagination.limit,
      offset: pagination.offset,
      total: result.total,
    },
  };
}
