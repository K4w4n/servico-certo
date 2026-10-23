import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/repositories/service-order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { ServiceOrderNotFoundError } from '../errors/service-order.errors.js';

export type DeleteServiceOrderCommand = {
  tenantId: string;
  serviceOrderId: string;
};

@Injectable()
export class DeleteServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY) private readonly orders: ServiceOrderRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: DeleteServiceOrderCommand): Promise<void> {
    const deleted = await this.orders.softDelete(
      command.tenantId,
      command.serviceOrderId,
      this.clock.now(),
    );

    if (!deleted) {
      throw new ServiceOrderNotFoundError();
    }
  }
}
