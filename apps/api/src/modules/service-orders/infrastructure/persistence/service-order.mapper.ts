import { toDate, toNullableDate } from '../../../../shared/database/date.js';
import {
  ServiceOrder,
  type ServiceOrderProductItem,
  type ServiceOrderServiceItem,
} from '../../domain/entities/service-order.js';
import { Protocol } from '../../domain/value-objects/protocol.js';

export type ServiceOrderRow = {
  id: string;
  tenant_id: string;
  protocol: string;
  note: string | null;
  customer_id: string;
  created_by_account_id: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

export type ServiceOrderProductRow = {
  tenant_id: string;
  service_order_id: string;
  product_id: string;
  product_name: string;
  unit_price_cents: number | string;
  quantity: number | string;
};

export type ServiceOrderServiceRow = {
  tenant_id: string;
  service_order_id: string;
  service_id: string;
  service_name: string;
  price_cents: number | string;
};

export const serviceOrderMapper = {
  toDomain(
    order: ServiceOrderRow,
    products: ServiceOrderProductRow[],
    services: ServiceOrderServiceRow[],
  ): ServiceOrder {
    return ServiceOrder.restore({
      id: order.id,
      tenantId: order.tenant_id,
      protocol: Protocol.restore(order.protocol),
      note: order.note,
      customerId: order.customer_id,
      createdBy:
        order.created_by_account_id && order.created_by_name && order.created_by_email
          ? {
              accountId: order.created_by_account_id,
              name: order.created_by_name,
              email: order.created_by_email,
            }
          : null,
      products: products.map(toProductItem),
      services: services.map(toServiceItem),
      createdAt: toDate(order.created_at),
      updatedAt: toDate(order.updated_at),
      deletedAt: toNullableDate(order.deleted_at),
    });
  },

  toPersistence(order: ServiceOrder): ServiceOrderRow {
    return {
      id: order.id,
      tenant_id: order.tenantId,
      protocol: order.protocol.value,
      note: order.note,
      customer_id: order.customerId,
      created_by_account_id: order.createdBy?.accountId ?? null,
      created_by_name: order.createdBy?.name ?? null,
      created_by_email: order.createdBy?.email ?? null,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      deleted_at: order.deletedAt,
    };
  },

  productToPersistence(
    tenantId: string,
    serviceOrderId: string,
    item: ServiceOrderProductItem,
  ): ServiceOrderProductRow {
    return {
      tenant_id: tenantId,
      service_order_id: serviceOrderId,
      product_id: item.productId,
      product_name: item.name,
      unit_price_cents: item.unitPriceCents,
      quantity: item.quantity,
    };
  },

  serviceToPersistence(
    tenantId: string,
    serviceOrderId: string,
    item: ServiceOrderServiceItem,
  ): ServiceOrderServiceRow {
    return {
      tenant_id: tenantId,
      service_order_id: serviceOrderId,
      service_id: item.serviceId,
      service_name: item.name,
      price_cents: item.priceCents,
    };
  },
};

function toProductItem(row: ServiceOrderProductRow): ServiceOrderProductItem {
  return {
    productId: row.product_id,
    name: row.product_name,
    unitPriceCents: Number(row.unit_price_cents),
    quantity: Number(row.quantity),
  };
}

function toServiceItem(row: ServiceOrderServiceRow): ServiceOrderServiceItem {
  return {
    serviceId: row.service_id,
    name: row.service_name,
    priceCents: Number(row.price_cents),
  };
}
