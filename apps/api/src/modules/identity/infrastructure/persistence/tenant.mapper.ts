import { toDate } from '../../../../shared/database/date.js';
import { Tenant } from '../../domain/entities/tenant.js';
import { TenantDomain } from '../../domain/value-objects/tenant-domain.js';

export type TenantRow = {
  id: string;
  name: string;
  domain: string;
  created_at: Date | string;
  updated_at: Date | string;
};

export const tenantMapper = {
  toDomain(row: TenantRow): Tenant {
    return Tenant.restore({
      id: row.id,
      name: row.name,
      domain: TenantDomain.create(row.domain),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    });
  },

  toPersistence(tenant: Tenant): TenantRow {
    return {
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain.value,
      created_at: tenant.createdAt,
      updated_at: tenant.updatedAt,
    };
  },
};
