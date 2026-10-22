import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../../shared/application/ports/id-generator.js';
import { isUniqueViolation } from '../../../../shared/database/unique-violation.js';
import { Customer } from '../../domain/entities/customer.js';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../../domain/repositories/customer.repository.js';
import { Document, type DocumentType } from '../../domain/value-objects/document.js';
import { PhoneNumber } from '../../domain/value-objects/phone-number.js';
import { InvalidDocumentError } from '../../domain/errors/customer.errors.js';
import { DocumentAlreadyInUseError } from '../errors/customer.errors.js';

export type CreateCustomerCommand = {
  tenantId: string;
  name: string;
  address?: string | null;
  document?: string | null;
  documentType?: DocumentType | null;
  phoneNumber?: string | null;
};

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateCustomerCommand): Promise<Customer> {
    const document = buildDocument(command.document, command.documentType);
    const phoneNumber = command.phoneNumber ? PhoneNumber.create(command.phoneNumber) : null;

    if (document) {
      const existing = await this.customers.findByDocument(command.tenantId, document.value);

      if (existing) {
        throw new DocumentAlreadyInUseError();
      }
    }

    const customer = Customer.create({
      id: this.ids.next(),
      tenantId: command.tenantId,
      name: command.name,
      address: command.address,
      document,
      phoneNumber,
      now: this.clock.now(),
    });

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

function buildDocument(
  document: string | null | undefined,
  documentType: DocumentType | null | undefined,
): Document | null {
  const hasDocument = document !== undefined && document !== null;
  const hasDocumentType = documentType !== undefined && documentType !== null;

  if (hasDocument !== hasDocumentType) {
    throw new InvalidDocumentError('Informe document e documentType juntos');
  }

  if (!hasDocument || !hasDocumentType) {
    return null;
  }

  return Document.create(document, documentType);
}
