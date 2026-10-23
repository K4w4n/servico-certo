import { describe, expect, it } from 'vitest';
import {
  InvalidServiceOrderItemError,
  ServiceOrderItemsRequiredError,
} from '../errors/service-order.errors.js';
import { ServiceOrder } from './service-order.js';
import { Protocol } from '../value-objects/protocol.js';

const now = new Date('2026-10-22T00:00:00.000Z');

function createOrder(
  overrides: Partial<Parameters<typeof ServiceOrder.create>[0]> = {},
): ServiceOrder {
  return ServiceOrder.create({
    id: '019b0000-0000-7000-8000-000000000001',
    tenantId: '019b0000-0000-7000-8000-000000000002',
    protocol: Protocol.fromSequence(1),
    customerId: '019b0000-0000-7000-8000-000000000003',
    note: '  Observação  ',
    products: [
      {
        productId: '019b0000-0000-7000-8000-000000000004',
        name: 'Óleo 5W30',
        unitPriceCents: 3500,
        quantity: 2,
      },
    ],
    services: [
      {
        serviceId: '019b0000-0000-7000-8000-000000000005',
        name: 'Troca de óleo',
        priceCents: 12000,
      },
    ],
    now,
    ...overrides,
  });
}

describe('ServiceOrder', () => {
  it('calcula o total da ordem', () => {
    const order = createOrder();

    expect(order.totalCents).toBe(19000);
    expect(order.protocol.value).toBe('100001');
    expect(order.note).toBe('Observação');
    expect(order.hasItems).toBe(true);
  });

  it('exige pelo menos um item', () => {
    expect(() => createOrder({ products: [], services: [] })).toThrow(
      ServiceOrderItemsRequiredError,
    );
  });

  it('rejeita produto duplicado', () => {
    expect(() =>
      createOrder({
        products: [
          {
            productId: '019b0000-0000-7000-8000-000000000004',
            name: 'Óleo 5W30',
            unitPriceCents: 3500,
            quantity: 1,
          },
          {
            productId: '019b0000-0000-7000-8000-000000000004',
            name: 'Óleo 5W30',
            unitPriceCents: 3500,
            quantity: 2,
          },
        ],
      }),
    ).toThrow(InvalidServiceOrderItemError);
  });

  it('rejeita serviço duplicado', () => {
    expect(() =>
      createOrder({
        services: [
          {
            serviceId: '019b0000-0000-7000-8000-000000000005',
            name: 'Troca de óleo',
            priceCents: 12000,
          },
          {
            serviceId: '019b0000-0000-7000-8000-000000000005',
            name: 'Troca de óleo',
            priceCents: 12000,
          },
        ],
      }),
    ).toThrow(InvalidServiceOrderItemError);
  });

  it('rejeita preço negativo e quantidade inválida', () => {
    expect(() =>
      createOrder({
        products: [
          {
            productId: '019b0000-0000-7000-8000-000000000004',
            name: 'Óleo 5W30',
            unitPriceCents: -1,
            quantity: 1,
          },
        ],
      }),
    ).toThrow(InvalidServiceOrderItemError);

    expect(() =>
      createOrder({
        products: [
          {
            productId: '019b0000-0000-7000-8000-000000000004',
            name: 'Óleo 5W30',
            unitPriceCents: 3500,
            quantity: 0,
          },
        ],
      }),
    ).toThrow(InvalidServiceOrderItemError);
  });

  it('permite limpar a observação e substituir itens', () => {
    const order = createOrder();

    order.changeNote(null, now);
    order.replaceProducts([], now);

    expect(order.note).toBeNull();
    expect(order.products).toEqual([]);
    expect(order.hasItems).toBe(true);

    order.replaceServices([], now);

    expect(order.hasItems).toBe(false);
  });
});
