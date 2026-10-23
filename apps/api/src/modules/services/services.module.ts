import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { CreateServiceUseCase } from './application/use-cases/create-service.use-case.js';
import { DeleteServiceUseCase } from './application/use-cases/delete-service.use-case.js';
import { GetServiceUseCase } from './application/use-cases/get-service.use-case.js';
import { ListServicesUseCase } from './application/use-cases/list-services.use-case.js';
import { UpdateServiceUseCase } from './application/use-cases/update-service.use-case.js';
import { SERVICE_REPOSITORY } from './domain/repositories/service.repository.js';
import { KnexServiceRepository } from './infrastructure/persistence/knex-service.repository.js';
import { ServicesController } from './presentation/http/services.controller.js';

@Module({
  imports: [IdentityModule],
  controllers: [ServicesController],
  providers: [
    CreateServiceUseCase,
    GetServiceUseCase,
    UpdateServiceUseCase,
    DeleteServiceUseCase,
    ListServicesUseCase,
    { provide: SERVICE_REPOSITORY, useClass: KnexServiceRepository },
  ],
  exports: [SERVICE_REPOSITORY],
})
export class ServicesModule {}
