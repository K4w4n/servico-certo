import { toDate, toNullableDate } from '../../../../shared/database/date.js';
import { Service } from '../../domain/entities/service.js';
import { ServicePrice } from '../../domain/value-objects/price.js';

export type ServiceRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  price_cents: number | string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

export const serviceMapper = {
  toDomain(row: ServiceRow): Service {
    return Service.restore({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      price: ServicePrice.fromCents(Number(row.price_cents)),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: toNullableDate(row.deleted_at),
    });
  },

  toPersistence(service: Service): ServiceRow {
    return {
      id: service.id,
      tenant_id: service.tenantId,
      name: service.name,
      description: service.description,
      price_cents: service.price.cents,
      created_at: service.createdAt,
      updated_at: service.updatedAt,
      deleted_at: service.deletedAt,
    };
  },
};
