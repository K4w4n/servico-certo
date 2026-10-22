import type { Customer } from '../entities/customer.js';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export type CustomerListFilters = {
  tenantId: string;
  limit: number;
  offset: number;
  name?: string;
  document?: string;
};

export type CustomerListResult = {
  items: Customer[];
  total: number;
};

export interface CustomerRepository {
  findById(tenantId: string, id: string): Promise<Customer | null>;
  findByDocument(tenantId: string, document: string): Promise<Customer | null>;
  list(filters: CustomerListFilters): Promise<CustomerListResult>;
  save(customer: Customer): Promise<void>;
  softDelete(tenantId: string, id: string, deletedAt: Date): Promise<boolean>;
}
