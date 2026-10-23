import { Inject, Injectable } from '@nestjs/common';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import { InvalidProtocolError } from '../../domain/errors/service-order.errors.js';
import type { ServiceOrder } from '../../domain/entities/service-order.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { Protocol } from '../../domain/value-objects/protocol.js';
import {
  serviceOrderMapper,
  type ServiceOrderProductRow,
  type ServiceOrderRow,
  type ServiceOrderServiceRow,
} from './service-order.mapper.js';

@Injectable()
export class KnexServiceOrderRepository implements ServiceOrderRepository {
  constructor(@Inject(KnexUnitOfWork) private readonly uow: KnexUnitOfWork) {}

  async findById(tenantId: string, id: string): Promise<ServiceOrder | null> {
    const order = (await this.uow
      .executor('service_orders')
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .first()) as ServiceOrderRow | undefined;

    if (!order) {
      return null;
    }

    const products = (await this.uow
      .executor('service_order_products')
      .where({ service_order_id: id, tenant_id: tenantId })
      .select('*')) as ServiceOrderProductRow[];
    const services = (await this.uow
      .executor('service_order_services')
      .where({ service_order_id: id, tenant_id: tenantId })
      .select('*')) as ServiceOrderServiceRow[];

    return serviceOrderMapper.toDomain(order, products, services);
  }

  async save(order: ServiceOrder): Promise<void> {
    await this.uow
      .executor('service_orders')
      .insert(serviceOrderMapper.toPersistence(order))
      .onConflict('id')
      .merge();
  }

  async replaceItems(order: ServiceOrder): Promise<void> {
    await this.uow
      .executor('service_order_products')
      .where({ service_order_id: order.id, tenant_id: order.tenantId })
      .del();
    await this.uow
      .executor('service_order_services')
      .where({ service_order_id: order.id, tenant_id: order.tenantId })
      .del();

    const productRows = order.products.map((item) =>
      serviceOrderMapper.productToPersistence(order.tenantId, order.id, item),
    );
    const serviceRows = order.services.map((item) =>
      serviceOrderMapper.serviceToPersistence(order.tenantId, order.id, item),
    );

    if (productRows.length > 0) {
      await this.uow.executor('service_order_products').insert(productRows);
    }

    if (serviceRows.length > 0) {
      await this.uow.executor('service_order_services').insert(serviceRows);
    }
  }

  async nextProtocol(tenantId: string): Promise<Protocol> {
    await this.uow
      .executor('service_order_counters')
      .insert({ tenant_id: tenantId, last_value: 0 })
      .onConflict('tenant_id')
      .ignore();

    const rows = (await this.uow
      .executor('service_order_counters')
      .where({ tenant_id: tenantId })
      .increment('last_value', 1)
      .returning('last_value')) as Array<{ last_value: number | string }>;

    const sequence = Number(rows[0]?.last_value);

    if (!Number.isInteger(sequence) || sequence < 1) {
      throw new InvalidProtocolError();
    }

    return Protocol.fromSequence(sequence);
  }

  async softDelete(tenantId: string, id: string, deletedAt: Date): Promise<boolean> {
    const updated = await this.uow
      .executor('service_orders')
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
      });

    return updated > 0;
  }
}
