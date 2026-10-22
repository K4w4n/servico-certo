import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import { isUniqueViolation } from '../../../../shared/database/unique-violation.js';
import type { Customer } from '../../domain/entities/customer.js';
import { InvalidDocumentError } from '../../domain/errors/customer.errors.js';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../../domain/repositories/customer.repository.js';
import { Document, type DocumentType } from '../../domain/value-objects/document.js';
import { PhoneNumber } from '../../domain/value-objects/phone-number.js';
import { CustomerNotFoundError, DocumentAlreadyInUseError } from '../errors/customer.errors.js';

export type UpdateCustomerCommand = {
  tenantId: string;
  customerId: string;
  name?: string;
  address?: string | null;
  document?: string | null;
  documentType?: DocumentType | null;
  phoneNumber?: string | null;
};

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateCustomerCommand): Promise<Customer> {
    const customer = await this.customers.findById(command.tenantId, command.customerId);

    if (!customer) {
      throw new CustomerNotFoundError();
    }

    const now = this.clock.now();

    if (command.name !== undefined) {
      customer.changeName(command.name, now);
    }

    if (command.address !== undefined) {
      customer.changeAddress(command.address, now);
    }

    if (command.phoneNumber !== undefined) {
      customer.changePhoneNumber(
        command.phoneNumber === null ? null : PhoneNumber.create(command.phoneNumber),
        now,
      );
    }

    if (command.document !== undefined || command.documentType !== undefined) {
      const hasDocument = command.document !== undefined && command.document !== null;
      const hasDocumentType = command.documentType !== undefined && command.documentType !== null;

      if (hasDocument !== hasDocumentType) {
        throw new InvalidDocumentError('Informe document e documentType juntos');
      }

      if (!hasDocument || !hasDocumentType) {
        if (command.document === null || command.documentType === null) {
          customer.changeDocument(null, now);
        }
      } else {
        const nextDocument = Document.create(
          command.document as string,
          command.documentType as DocumentType,
        );

        if (!nextDocument.equals(customer.document)) {
          const existing = await this.customers.findByDocument(
            command.tenantId,
            nextDocument.value,
          );

          if (existing && existing.id !== customer.id) {
            throw new DocumentAlreadyInUseError();
          }

          customer.changeDocument(nextDocument, now);
        }
      }
    }

    try {
      await this.customers.save(customer);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DocumentAlreadyInUseError();
      }

      throw error;
    }

    return customer;
  }
}
