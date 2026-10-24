import {
  InvalidServiceOrderCreatorError,
  InvalidServiceOrderItemError,
  InvalidServiceOrderNoteError,
  ServiceOrderItemsRequiredError,
} from '../errors/service-order.errors.js';
import type { Protocol } from '../value-objects/protocol.js';

export const MAX_SERVICE_ORDER_ITEM_PRICE_CENTS = 9_999_999_999;
export const MAX_SERVICE_ORDER_ITEM_QUANTITY = 9999;
export const MAX_SERVICE_ORDER_NOTE_LENGTH = 2000;

export type ServiceOrderProductItem = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export type ServiceOrderServiceItem = {
  serviceId: string;
  name: string;
  priceCents: number;
};

export type ServiceOrderCreator = {
  accountId: string;
  name: string;
  email: string;
};

export type ServiceOrderProps = {
  id: string;
  tenantId: string;
  protocol: Protocol;
  note: string | null;
  customerId: string;
  createdBy: ServiceOrderCreator | null;
  products: ServiceOrderProductItem[];
  services: ServiceOrderServiceItem[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class ServiceOrder {
  private constructor(private readonly props: ServiceOrderProps) {}

  static create(input: {
    id: string;
    tenantId: string;
    protocol: Protocol;
    customerId: string;
    createdBy: ServiceOrderCreator;
    note?: string | null;
    products: ServiceOrderProductItem[];
    services: ServiceOrderServiceItem[];
    now: Date;
  }): ServiceOrder {
    const products = normalizeProducts(input.products);
    const services = normalizeServices(input.services);

    if (products.length === 0 && services.length === 0) {
      throw new ServiceOrderItemsRequiredError();
    }

    return new ServiceOrder({
      id: input.id,
      tenantId: input.tenantId,
      protocol: input.protocol,
      note: normalizeNote(input.note ?? null),
      customerId: input.customerId,
      createdBy: normalizeCreator(input.createdBy),
      products,
      services,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    });
  }

  static restore(props: ServiceOrderProps): ServiceOrder {
    return new ServiceOrder(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get protocol(): Protocol {
    return this.props.protocol;
  }

  get note(): string | null {
    return this.props.note;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get createdBy(): ServiceOrderCreator | null {
    return this.props.createdBy;
  }

  get products(): ServiceOrderProductItem[] {
    return this.props.products;
  }

  get services(): ServiceOrderServiceItem[] {
    return this.props.services;
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

  get hasItems(): boolean {
    return this.props.products.length > 0 || this.props.services.length > 0;
  }

  get totalCents(): number {
    const productTotal = this.props.products.reduce(
      (total, item) => total + item.unitPriceCents * item.quantity,
      0,
    );
    const serviceTotal = this.props.services.reduce((total, item) => total + item.priceCents, 0);

    return productTotal + serviceTotal;
  }

  changeCustomer(customerId: string, now: Date): void {
    this.props.customerId = customerId;
    this.props.updatedAt = now;
  }

  changeNote(note: string | null, now: Date): void {
    this.props.note = normalizeNote(note);
    this.props.updatedAt = now;
  }

  replaceProducts(products: ServiceOrderProductItem[], now: Date): void {
    this.props.products = normalizeProducts(products);
    this.props.updatedAt = now;
  }

  replaceServices(services: ServiceOrderServiceItem[], now: Date): void {
    this.props.services = normalizeServices(services);
    this.props.updatedAt = now;
  }

  softDelete(now: Date): void {
    this.props.deletedAt = now;
    this.props.updatedAt = now;
  }
}

function normalizeCreator(creator: ServiceOrderCreator): ServiceOrderCreator {
  const accountId = creator.accountId.trim();
  const name = creator.name.trim().replace(/\s+/g, ' ');
  const email = creator.email.trim().toLowerCase();

  if (accountId.length === 0 || name.length === 0 || email.length === 0) {
    throw new InvalidServiceOrderCreatorError();
  }

  return { accountId, name, email };
}

function normalizeNote(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }

  const value = raw.trim();

  if (value.length === 0) {
    return null;
  }

  if (value.length > MAX_SERVICE_ORDER_NOTE_LENGTH) {
    throw new InvalidServiceOrderNoteError();
  }

  return value;
}

function normalizeProducts(items: ServiceOrderProductItem[]): ServiceOrderProductItem[] {
  const normalized = items.map((item) => ({
    productId: item.productId,
    name: normalizeItemName(item.name),
    unitPriceCents: normalizePrice(item.unitPriceCents),
    quantity: normalizeQuantity(item.quantity),
  }));

  if (new Set(normalized.map((item) => item.productId)).size !== normalized.length) {
    throw new InvalidServiceOrderItemError('Produto duplicado na ordem de serviço');
  }

  return normalized;
}

function normalizeServices(items: ServiceOrderServiceItem[]): ServiceOrderServiceItem[] {
  const normalized = items.map((item) => ({
    serviceId: item.serviceId,
    name: normalizeItemName(item.name),
    priceCents: normalizePrice(item.priceCents),
  }));

  if (new Set(normalized.map((item) => item.serviceId)).size !== normalized.length) {
    throw new InvalidServiceOrderItemError('Serviço duplicado na ordem de serviço');
  }

  return normalized;
}

function normalizeItemName(raw: string): string {
  const value = raw.trim().replace(/\s+/g, ' ');

  if (value.length < 1 || value.length > 160) {
    throw new InvalidServiceOrderItemError('Nome do item inválido');
  }

  return value;
}

function normalizePrice(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_SERVICE_ORDER_ITEM_PRICE_CENTS) {
    throw new InvalidServiceOrderItemError('Preço do item inválido');
  }

  return value;
}

function normalizeQuantity(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > MAX_SERVICE_ORDER_ITEM_QUANTITY) {
    throw new InvalidServiceOrderItemError('Quantidade do item inválida');
  }

  return value;
}
