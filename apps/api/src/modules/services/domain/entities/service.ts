import {
  InvalidServiceDescriptionError,
  InvalidServiceNameError,
} from '../errors/service.errors.js';
import type { ServicePrice } from '../value-objects/price.js';

export type ServiceProps = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: ServicePrice;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class Service {
  private constructor(private readonly props: ServiceProps) {}

  static create(input: {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    price: ServicePrice;
    now: Date;
  }): Service {
    return new Service({
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

  static restore(props: ServiceProps): Service {
    return new Service(props);
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

  get price(): ServicePrice {
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

  changePrice(price: ServicePrice, now: Date): void {
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
    throw new InvalidServiceNameError();
  }

  return value;
}

function normalizeDescription(raw: string): string {
  const value = raw.trim();

  if (value.length < 1 || value.length > 2000) {
    throw new InvalidServiceDescriptionError();
  }

  return value;
}
