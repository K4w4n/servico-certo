import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../domain/repositories/service.repository.js';
import { ServiceNotFoundError } from '../errors/service.errors.js';

export type DeleteServiceCommand = {
  tenantId: string;
  serviceId: string;
};

@Injectable()
export class DeleteServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: DeleteServiceCommand): Promise<void> {
    const deleted = await this.services.softDelete(
      command.tenantId,
      command.serviceId,
      this.clock.now(),
    );

    if (!deleted) {
      throw new ServiceNotFoundError();
    }
  }
}
