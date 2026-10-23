import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_REPOSITORY,
  type ServiceListResult,
  type ServiceRepository,
} from '../../domain/repositories/service.repository.js';

export type ListServicesCommand = {
  tenantId: string;
  limit: number;
  offset: number;
  name?: string;
};

@Injectable()
export class ListServicesUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository) {}

  async execute(command: ListServicesCommand): Promise<ServiceListResult> {
    return this.services.list({
      tenantId: command.tenantId,
      limit: command.limit,
      offset: command.offset,
      ...(command.name ? { name: command.name } : {}),
    });
  }
}
