import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../../shared/application/ports/id-generator.js';
import { Service } from '../../domain/entities/service.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../domain/repositories/service.repository.js';
import { ServicePrice } from '../../domain/value-objects/price.js';

export type CreateServiceCommand = {
  tenantId: string;
  name: string;
  description: string;
  priceCents: number;
};

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateServiceCommand): Promise<Service> {
    const service = Service.create({
      id: this.ids.next(),
      tenantId: command.tenantId,
      name: command.name,
      description: command.description,
      price: ServicePrice.fromCents(command.priceCents),
      now: this.clock.now(),
    });

    await this.services.save(service);

    return service;
  }
}
