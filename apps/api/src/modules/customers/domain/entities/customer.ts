import { InvalidAddressError, InvalidCustomerNameError } from '../errors/customer.errors.js';
import type { Document } from '../value-objects/document.js';
import type { PhoneNumber } from '../value-objects/phone-number.js';

export type CustomerProps = {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  document: Document | null;
  phoneNumber: PhoneNumber | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class Customer {
  private constructor(private readonly props: CustomerProps) {}

  static create(input: {
    id: string;
    tenantId: string;
    name: string;
    address?: string | null;
    document?: Document | null;
    phoneNumber?: PhoneNumber | null;
    now: Date;
  }): Customer {
    return new Customer({
      id: input.id,
      tenantId: input.tenantId,
      name: normalizeName(input.name),
      address: normalizeAddress(input.address ?? null),
      document: input.document ?? null,
      phoneNumber: input.phoneNumber ?? null,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    });
  }

  static restore(props: CustomerProps): Customer {
    return new Customer(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get address(): string | null {
    return this.props.address;
  }

  get document(): Document | null {
    return this.props.document;
  }

  get phoneNumber(): PhoneNumber | null {
    return this.props.phoneNumber;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  changeName(name: string, now: Date): void {
    this.props.name = normalizeName(name);
    this.props.updatedAt = now;
  }

  changeAddress(address: string | null, now: Date): void {
    this.props.address = normalizeAddress(address);
    this.props.updatedAt = now;
  }

  changeDocument(document: Document | null, now: Date): void {
    this.props.document = document;
    this.props.updatedAt = now;
  }

  changePhoneNumber(phoneNumber: PhoneNumber | null, now: Date): void {
    this.props.phoneNumber = phoneNumber;
    this.props.updatedAt = now;
  }

  softDelete(now: Date): void {
    this.props.deletedAt = now;
    this.props.updatedAt = now;
  }
}

function normalizeName(raw: string): string {
  const value = raw.trim().replace(/\s+/g, ' ');

  if (value.length < 1 || value.length > 160) {
    throw new InvalidCustomerNameError();
  }

  return value;
}

function normalizeAddress(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }

  const value = raw.trim();

  if (value.length === 0) {
    return null;
  }

  if (value.length > 500) {
    throw new InvalidAddressError();
  }

  return value;
}
