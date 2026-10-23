import type { Service } from '../entities/service.js';

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');

export type ServiceListFilters = {
  tenantId: string;
  limit: number;
  offset: number;
  name?: string;
};

export type ServiceListResult = {
  items: Service[];
  total: number;
};

export interface ServiceRepository {
  findById(tenantId: string, id: string): Promise<Service | null>;
  list(filters: ServiceListFilters): Promise<ServiceListResult>;
  save(service: Service): Promise<void>;
  softDelete(tenantId: string, id: string, deletedAt: Date): Promise<boolean>;
}
