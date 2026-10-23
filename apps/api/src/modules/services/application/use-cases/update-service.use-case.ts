import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import type { Service } from '../../domain/entities/service.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../domain/repositories/service.repository.js';
import { ServicePrice } from '../../domain/value-objects/price.js';
import { ServiceNotFoundError } from '../errors/service.errors.js';

export type UpdateServiceCommand = {
  tenantId: string;
  serviceId: string;
  name?: string;
  description?: string;
  priceCents?: number;
};

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateServiceCommand): Promise<Service> {
    const service = await this.services.findById(command.tenantId, command.serviceId);

    if (!service) {
      throw new ServiceNotFoundError();
    }

    const now = this.clock.now();

    if (command.name !== undefined) {
      service.changeName(command.name, now);
    }

    if (command.description !== undefined) {
      service.changeDescription(command.description, now);
    }

    if (command.priceCents !== undefined) {
      service.changePrice(ServicePrice.fromCents(command.priceCents), now);
    }

    await this.services.save(service);

    return service;
  }
}
