import { Inject, Injectable } from '@nestjs/common';
import type { Service } from '../../domain/entities/service.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../domain/repositories/service.repository.js';
import { ServiceNotFoundError } from '../errors/service.errors.js';

export type GetServiceCommand = {
  tenantId: string;
  serviceId: string;
};

@Injectable()
export class GetServiceUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository) {}

  async execute(command: GetServiceCommand): Promise<Service> {
    const service = await this.services.findById(command.tenantId, command.serviceId);

    if (!service) {
      throw new ServiceNotFoundError();
    }

    return service;
  }
}
