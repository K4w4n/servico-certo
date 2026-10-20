import type { Tenant } from '../entities/tenant.js';

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');

export interface TenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findByDomain(domain: string): Promise<Tenant | null>;
  existsByDomain(domain: string): Promise<boolean>;
  save(tenant: Tenant): Promise<void>;
}
