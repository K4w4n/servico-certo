import {
  InvalidProductDescriptionError,
  InvalidProductNameError,
} from '../errors/product.errors.js';
import type { Price } from '../value-objects/price.js';

export type ProductProps = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: Price;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class Product {
  private constructor(private readonly props: ProductProps) {}

  static create(input: {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    price: Price;
    now: Date;
  }): Product {
    return new Product({
      id: input.id,
      tenantId: input.tenantId,
      name: normalizeName(input.name),
      description: normalizeDescription(input.description),
      price: input.price,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    });
  }

  static restore(props: ProductProps): Product {
    return new Product(props);
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

  get description(): string {
    return this.props.description;
  }

  get price(): Price {
    return this.props.price;
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

  changeDescription(description: string, now: Date): void {
    this.props.description = normalizeDescription(description);
    this.props.updatedAt = now;
  }

  changePrice(price: Price, now: Date): void {
    this.props.price = price;
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
    throw new InvalidProductNameError();
  }

  return value;
}

function normalizeDescription(raw: string): string {
  const value = raw.trim();

  if (value.length > 2000) {
    throw new InvalidProductDescriptionError();
  }

  return value;
}
