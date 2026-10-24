import { describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../../customers/domain/entities/customer.js';
import type { CustomerRepository } from '../../../customers/domain/repositories/customer.repository.js';
import { Product } from '../../../products/domain/entities/product.js';
import type { ProductRepository } from '../../../products/domain/repositories/product.repository.js';
import { Price } from '../../../products/domain/value-objects/price.js';
import { Service } from '../../../services/domain/entities/service.js';
import type { ServiceRepository } from '../../../services/domain/repositories/service.repository.js';
import { ServicePrice } from '../../../services/domain/value-objects/price.js';
import { ServiceOrder } from '../../domain/entities/service-order.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import { Protocol } from '../../domain/value-objects/protocol.js';
import type { ServiceOrderQueries, ServiceOrderView } from '../queries/service-order.queries.js';
import { CreateServiceOrderUseCase } from './create-service-order.use-case.js';
import { UpdateServiceOrderUseCase } from './update-service-order.use-case.js';

const now = new Date('2026-10-22T00:00:00.000Z');

const customer = { id: 'c1' } as unknown as Customer;

const productA = Product.create({
  id: 'p1',
  tenantId: 't1',
  name: 'Produto A',
  description: 'Descrição A',
  price: Price.fromCents(1000),
  now,
});
const productB = Product.create({
  id: 'p2',
  tenantId: 't1',
  name: 'Produto B',
  description: 'Descrição B',
  price: Price.fromCents(2000),
  now,
});
const serviceA = Service.create({
  id: 's1',
  tenantId: 't1',
  name: 'Serviço A',
  description: 'Descrição A',
  price: ServicePrice.fromCents(3000),
  now,
});

const view: ServiceOrderView = {
  id: 'o1',
  protocol: '100001',
  note: null,
  customer: {
    id: 'c1',
    name: 'Cliente',
    address: null,
    document: null,
    documentType: null,
    phoneNumber: null,
  },
  createdBy: {
    id: 'a1',
    name: 'Conta',
    email: 'conta@exemplo.com',
  },
  products: [],
  services: [],
  totalCents: 0,
  createdAt: now,
  updatedAt: now,
};

function createRepositories() {
  const customers = {
    findById: vi.fn().mockResolvedValue(customer),
  } as unknown as CustomerRepository;
  const orders = {
    findById: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    replaceItems: vi.fn().mockResolvedValue(undefined),
    nextProtocol: vi.fn().mockResolvedValue(Protocol.fromSequence(1)),
    softDelete: vi.fn(),
  } as unknown as ServiceOrderRepository;
  const queries = {
    findById: vi.fn().mockResolvedValue(view),
    list: vi.fn(),
  } as unknown as ServiceOrderQueries;
  const products = {
    findById: vi.fn(),
    findByIds: vi.fn().mockResolvedValue([productA, productB]),
    list: vi.fn(),
    save: vi.fn(),
    softDelete: vi.fn(),
  } as unknown as ProductRepository;
  const services = {
    findById: vi.fn(),
    findByIds: vi.fn().mockResolvedValue([serviceA]),
    list: vi.fn(),
    save: vi.fn(),
    softDelete: vi.fn(),
  } as unknown as ServiceRepository;

  return { customers, orders, queries, products, services };
}

function createUnitOfWork() {
  return {
    run: <T>(work: () => Promise<T>): Promise<T> => work(),
  };
}

describe('Service order use cases — consultas em lote', () => {
  it('busca produtos e serviços em lote na criação', async () => {
    const { customers, orders, queries, products, services } = createRepositories();
    const useCase = new CreateServiceOrderUseCase(
      orders,
      queries,
      customers,
      products,
      services,
      createUnitOfWork(),
      { now: () => now },
      { next: () => 'o1' },
    );

    const result = await useCase.execute({
      tenantId: 't1',
      customerId: 'c1',
      createdBy: {
        accountId: 'a1',
        name: 'Conta',
        email: 'conta@exemplo.com',
      },
      products: [
        { productId: 'p1', unitPriceCents: 1100, quantity: 2 },
        { productId: 'p2', unitPriceCents: 2100, quantity: 1 },
      ],
      services: [{ serviceId: 's1', priceCents: 3100 }],
    });

    expect(result).toBe(view);
    expect(vi.mocked(products.findByIds)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(products.findByIds)).toHaveBeenCalledWith('t1', ['p1', 'p2']);
    expect(vi.mocked(services.findByIds)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(services.findByIds)).toHaveBeenCalledWith('t1', ['s1']);
    expect(vi.mocked(products.findById)).not.toHaveBeenCalled();
    expect(vi.mocked(services.findById)).not.toHaveBeenCalled();
    expect(vi.mocked(orders.save)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(orders.replaceItems)).toHaveBeenCalledTimes(1);
  });

  it('busca produtos e serviços em lote na edição', async () => {
    const { customers, orders, queries, products, services } = createRepositories();
    const existingOrder = ServiceOrder.create({
      id: 'o1',
      tenantId: 't1',
      protocol: Protocol.fromSequence(1),
      customerId: 'c1',
      createdBy: {
        accountId: 'a1',
        name: 'Conta',
        email: 'conta@exemplo.com',
      },
      note: null,
      products: [
        {
          productId: 'p-old',
          name: 'Produto Antigo',
          unitPriceCents: 500,
          quantity: 1,
        },
      ],
      services: [
        {
          serviceId: 's-old',
          name: 'Serviço Antigo',
          priceCents: 600,
        },
      ],
      now,
    });

    vi.mocked(orders.findById).mockResolvedValue(existingOrder);

    const useCase = new UpdateServiceOrderUseCase(
      orders,
      queries,
      customers,
      products,
      services,
      createUnitOfWork(),
      { now: () => now },
    );

    const result = await useCase.execute({
      tenantId: 't1',
      serviceOrderId: 'o1',
      products: [
        { productId: 'p1', unitPriceCents: 1100, quantity: 2 },
        { productId: 'p2', unitPriceCents: 2100, quantity: 1 },
      ],
      services: [{ serviceId: 's1', priceCents: 3100 }],
    });

    expect(result).toBe(view);
    expect(vi.mocked(products.findByIds)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(products.findByIds)).toHaveBeenCalledWith('t1', ['p1', 'p2']);
    expect(vi.mocked(services.findByIds)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(services.findByIds)).toHaveBeenCalledWith('t1', ['s1']);
    expect(vi.mocked(products.findById)).not.toHaveBeenCalled();
    expect(vi.mocked(services.findById)).not.toHaveBeenCalled();
    expect(vi.mocked(customers.findById)).not.toHaveBeenCalled();
    expect(vi.mocked(orders.save)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(orders.replaceItems)).toHaveBeenCalledTimes(1);
  });
});
