import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_ORDER_QUERIES,
  type ServiceOrderListResult,
  type ServiceOrderQueries,
} from '../queries/service-order.queries.js';

export type ListServiceOrdersCommand = {
  tenantId: string;
  limit: number;
  offset: number;
  protocol?: string;
  customerId?: string;
  productId?: string;
  serviceId?: string;
};

@Injectable()
export class ListServiceOrdersUseCase {
  constructor(@Inject(SERVICE_ORDER_QUERIES) private readonly queries: ServiceOrderQueries) {}

  async execute(command: ListServiceOrdersCommand): Promise<ServiceOrderListResult> {
    return this.queries.list({
      tenantId: command.tenantId,
      limit: command.limit,
      offset: command.offset,
      ...(command.protocol ? { protocol: command.protocol } : {}),
      ...(command.customerId ? { customerId: command.customerId } : {}),
      ...(command.productId ? { productId: command.productId } : {}),
      ...(command.serviceId ? { serviceId: command.serviceId } : {}),
    });
  }
}
