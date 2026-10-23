import {
  PUBLIC_ID_PREFIXES,
  type ListServiceOrdersResponse,
  type ServiceOrder as ServiceOrderResponse,
} from '@servico-certo/contracts';
import { encodePublicId } from '../../../../shared/ids/public-id.js';
import type {
  ServiceOrderListResult,
  ServiceOrderView,
} from '../../application/queries/service-order.queries.js';

export function toServiceOrderResponse(order: ServiceOrderView): ServiceOrderResponse {
  return {
    id: encodePublicId(PUBLIC_ID_PREFIXES.serviceOrder, order.id),
    protocol: order.protocol,
    note: order.note,
    customer: {
      id: encodePublicId(PUBLIC_ID_PREFIXES.customer, order.customer.id),
      name: order.customer.name,
      address: order.customer.address,
      document: order.customer.document,
      documentType: order.customer.documentType,
      phoneNumber: order.customer.phoneNumber,
    },
    products: order.products.map((item) => ({
      productId: encodePublicId(PUBLIC_ID_PREFIXES.product, item.productId),
      name: item.name,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      totalCents: item.totalCents,
    })),
    services: order.services.map((item) => ({
      serviceId: encodePublicId(PUBLIC_ID_PREFIXES.service, item.serviceId),
      name: item.name,
      priceCents: item.priceCents,
    })),
    totalCents: order.totalCents,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toListServiceOrdersResponse(
  result: ServiceOrderListResult,
  pagination: { limit: number; offset: number },
): ListServiceOrdersResponse {
  return {
    data: result.items.map(toServiceOrderResponse),
    meta: {
      limit: pagination.limit,
      offset: pagination.offset,
      total: result.total,
    },
  };
}
