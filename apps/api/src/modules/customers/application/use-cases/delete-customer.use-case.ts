import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../../domain/repositories/customer.repository.js';
import { CustomerNotFoundError } from '../errors/customer.errors.js';

export type DeleteCustomerCommand = {
  tenantId: string;
  customerId: string;
};

@Injectable()
export class DeleteCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: DeleteCustomerCommand): Promise<void> {
    const deleted = await this.customers.softDelete(
      command.tenantId,
      command.customerId,
      this.clock.now(),
    );

    if (!deleted) {
      throw new CustomerNotFoundError();
    }
  }
}
