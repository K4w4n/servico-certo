import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_ORDER_QUERIES,
  type ServiceOrderQueries,
  type ServiceOrderView,
} from '../queries/service-order.queries.js';
import { ServiceOrderNotFoundError } from '../errors/service-order.errors.js';

export type GetServiceOrderCommand = {
  tenantId: string;
  serviceOrderId: string;
};

@Injectable()
export class GetServiceOrderUseCase {
  constructor(@Inject(SERVICE_ORDER_QUERIES) private readonly queries: ServiceOrderQueries) {}

  async execute(command: GetServiceOrderCommand): Promise<ServiceOrderView> {
    const order = await this.queries.findById(command.tenantId, command.serviceOrderId);

    if (!order) {
      throw new ServiceOrderNotFoundError();
    }

    return order;
  }
}
