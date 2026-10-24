import { Inject, Injectable } from '@nestjs/common';
import { escapeLike } from '../../../../shared/database/like.js';
import { toDate } from '../../../../shared/database/date.js';
import { KnexUnitOfWork } from '../../../../shared/infrastructure/knex-unit-of-work.js';
import type {
  ServiceOrderCustomerView,
  ServiceOrderListFilters,
  ServiceOrderListResult,
  ServiceOrderProductView,
  ServiceOrderQueries,
  ServiceOrderServiceView,
  ServiceOrderView,
} from '../../application/queries/service-order.queries.js';
import type { ServiceOrderProductRow, ServiceOrderServiceRow } from './service-order.mapper.js';

type ServiceOrderDetailsRow = {
  id: string;
  protocol: string;
  note: string | null;
  customer_id: string;
  created_by_account_id: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  customer_name: string;
  customer_address: string | null;
  customer_document: string | null;
  customer_document_type: 'CPF' | 'CNPJ' | null;
  customer_phone_number: string | null;
};

const ORDER_COLUMNS = [
  'so.id',
  'so.protocol',
  'so.note',
  'so.customer_id',
  'so.created_by_account_id',
  'so.created_by_name',
  'so.created_by_email',
  'so.created_at',
  'so.updated_at',
  'c.name as customer_name',
  'c.address as customer_address',
  'c.document as customer_document',
  'c.document_type as customer_document_type',
  'c.phone_number as customer_phone_number',
] as const;

@Injectable()
export class KnexServiceOrderQueries implements ServiceOrderQueries {
  constructor(@Inject(KnexUnitOfWork) private readonly uow: KnexUnitOfWork) {}

  async findById(tenantId: string, id: string): Promise<ServiceOrderView | null> {
    const row = (await this.baseQuery(tenantId)
      .select(...ORDER_COLUMNS)
      .where('so.id', id)
      .first()) as ServiceOrderDetailsRow | undefined;

    if (!row) {
      return null;
    }

    const [products, services] = await this.loadItems(tenantId, [row.id]);

    return toView(row, products.get(row.id) ?? [], services.get(row.id) ?? []);
  }

  async list(filters: ServiceOrderListFilters): Promise<ServiceOrderListResult> {
    const query = this.baseQuery(filters.tenantId);

    if (filters.protocol) {
      query.whereRaw("so.protocol LIKE ? ESCAPE '\\'", [`%${escapeLike(filters.protocol)}%`]);
    }

    if (filters.customerId) {
      query.where('so.customer_id', filters.customerId);
    }

    if (filters.productId) {
      query.whereIn(
        'so.id',
        this.uow.executor('service_order_products').select('service_order_id').where({
          tenant_id: filters.tenantId,
          product_id: filters.productId,
        }),
      );
    }

    if (filters.serviceId) {
      query.whereIn(
        'so.id',
        this.uow.executor('service_order_services').select('service_order_id').where({
          tenant_id: filters.tenantId,
          service_id: filters.serviceId,
        }),
      );
    }

    const countRow = (await query
      .clone()
      .count<{ count: string | number }>('so.id as count')
      .first()) as { count: string | number } | undefined;

    const rows = (await query
      .clone()
      .select(...ORDER_COLUMNS)
      .orderBy('so.created_at', 'desc')
      .orderBy('so.id', 'desc')
      .limit(filters.limit)
      .offset(filters.offset)) as ServiceOrderDetailsRow[];

    const [products, services] = await this.loadItems(
      filters.tenantId,
      rows.map((row) => row.id),
    );

    return {
      items: rows.map((row) => toView(row, products.get(row.id) ?? [], services.get(row.id) ?? [])),
      total: Number(countRow?.count ?? 0),
    };
  }

  private baseQuery(tenantId: string) {
    return this.uow
      .executor('service_orders as so')
      .join('customers as c', function joinCustomer() {
        this.on('c.id', '=', 'so.customer_id').andOn('c.tenant_id', '=', 'so.tenant_id');
      })
      .where('so.tenant_id', tenantId)
      .whereNull('so.deleted_at');
  }

  private async loadItems(
    tenantId: string,
    orderIds: string[],
  ): Promise<[Map<string, ServiceOrderProductRow[]>, Map<string, ServiceOrderServiceRow[]>]> {
    const productMap = new Map<string, ServiceOrderProductRow[]>();
    const serviceMap = new Map<string, ServiceOrderServiceRow[]>();

    if (orderIds.length === 0) {
      return [productMap, serviceMap];
    }

    const productRows = (await this.uow
      .executor('service_order_products')
      .where({ tenant_id: tenantId })
      .whereIn('service_order_id', orderIds)
      .select('*')) as ServiceOrderProductRow[];
    const serviceRows = (await this.uow
      .executor('service_order_services')
      .where({ tenant_id: tenantId })
      .whereIn('service_order_id', orderIds)
      .select('*')) as ServiceOrderServiceRow[];

    for (const row of productRows) {
      const items = productMap.get(row.service_order_id) ?? [];
      items.push(row);
      productMap.set(row.service_order_id, items);
    }

    for (const row of serviceRows) {
      const items = serviceMap.get(row.service_order_id) ?? [];
      items.push(row);
      serviceMap.set(row.service_order_id, items);
    }

    return [productMap, serviceMap];
  }
}

function toView(
  row: ServiceOrderDetailsRow,
  products: ServiceOrderProductRow[],
  services: ServiceOrderServiceRow[],
): ServiceOrderView {
  const productViews: ServiceOrderProductView[] = products
    .map((item) => ({
      productId: item.product_id,
      name: item.product_name,
      unitPriceCents: Number(item.unit_price_cents),
      quantity: Number(item.quantity),
      totalCents: Number(item.unit_price_cents) * Number(item.quantity),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const serviceViews: ServiceOrderServiceView[] = services
    .map((item) => ({
      serviceId: item.service_id,
      name: item.service_name,
      priceCents: Number(item.price_cents),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const customer: ServiceOrderCustomerView = {
    id: row.customer_id,
    name: row.customer_name,
    address: row.customer_address,
    document: row.customer_document,
    documentType: row.customer_document_type,
    phoneNumber: row.customer_phone_number,
  };

  return {
    id: row.id,
    protocol: row.protocol,
    note: row.note,
    customer,
    createdBy:
      row.created_by_account_id && row.created_by_name && row.created_by_email
        ? {
            id: row.created_by_account_id,
            name: row.created_by_name,
            email: row.created_by_email,
          }
        : null,
    products: productViews,
    services: serviceViews,
    totalCents:
      productViews.reduce((total, item) => total + item.totalCents, 0) +
      serviceViews.reduce((total, item) => total + item.priceCents, 0),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}
