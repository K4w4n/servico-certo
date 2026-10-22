import { Module } from '@nestjs/common';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case.js';
import { DeleteCustomerUseCase } from './application/use-cases/delete-customer.use-case.js';
import { ListCustomersUseCase } from './application/use-cases/list-customers.use-case.js';
import { UpdateCustomerUseCase } from './application/use-cases/update-customer.use-case.js';
import { CUSTOMER_REPOSITORY } from './domain/repositories/customer.repository.js';
import { KnexCustomerRepository } from './infrastructure/persistence/knex-customer.repository.js';
import { CustomersController } from './presentation/http/customers.controller.js';
import { IdentityModule } from '../identity/identity.module.js';

@Module({
  imports: [IdentityModule],
  controllers: [CustomersController],
  providers: [
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
    ListCustomersUseCase,
    { provide: CUSTOMER_REPOSITORY, useClass: KnexCustomerRepository },
  ],
})
export class CustomersModule {}
