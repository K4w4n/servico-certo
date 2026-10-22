import { toDate, toNullableDate } from '../../../../shared/database/date.js';
import { Customer } from '../../domain/entities/customer.js';
import { InvalidDocumentError } from '../../domain/errors/customer.errors.js';
import { Document, type DocumentType } from '../../domain/value-objects/document.js';
import { PhoneNumber } from '../../domain/value-objects/phone-number.js';

export type CustomerRow = {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  document: string | null;
  document_type: string | null;
  phone_number: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

export const customerMapper = {
  toDomain(row: CustomerRow): Customer {
    return Customer.restore({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      address: row.address,
      document: toDocument(row.document, row.document_type),
      phoneNumber: row.phone_number ? PhoneNumber.create(row.phone_number) : null,
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: toNullableDate(row.deleted_at),
    });
  },

  toPersistence(customer: Customer): CustomerRow {
    return {
      id: customer.id,
      tenant_id: customer.tenantId,
      name: customer.name,
      address: customer.address,
      document: customer.document?.value ?? null,
      document_type: customer.document?.type ?? null,
      phone_number: customer.phoneNumber?.value ?? null,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
      deleted_at: customer.deletedAt,
    };
  },
};

function toDocument(value: string | null, type: string | null): Document | null {
  if (value === null && type === null) {
    return null;
  }

  if (value === null || type === null) {
    throw new InvalidDocumentError('Documento inconsistente');
  }

  if (type !== 'CPF' && type !== 'CNPJ') {
    throw new InvalidDocumentError('Tipo de documento inválido');
  }

  return Document.create(value, type as DocumentType);
}
