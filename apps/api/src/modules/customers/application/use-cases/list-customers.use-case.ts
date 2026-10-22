import { Inject, Injectable } from '@nestjs/common';
import {
  CUSTOMER_REPOSITORY,
  type CustomerListResult,
  type CustomerRepository,
} from '../../domain/repositories/customer.repository.js';

export type ListCustomersCommand = {
  tenantId: string;
  limit: number;
  offset: number;
  name?: string;
  document?: string;
};

@Injectable()
export class ListCustomersUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async execute(command: ListCustomersCommand): Promise<CustomerListResult> {
    return this.customers.list({
      tenantId: command.tenantId,
      limit: command.limit,
      offset: command.offset,
      ...(command.name ? { name: command.name } : {}),
      ...(command.document ? { document: command.document } : {}),
    });
  }
}
