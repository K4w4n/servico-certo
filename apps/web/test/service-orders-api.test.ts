import { describe, expect, it, vi } from 'vitest';
import {
  createServiceOrder,
  deleteServiceOrder,
  listServiceOrders,
  updateServiceOrder,
} from '@/modules/service-orders/lib/service-orders-api';

const CUSTOMER = {
  id: 'cus_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Ana Souza',
  address: null,
  document: null,
  documentType: null,
  phoneNumber: null,
};

const PRODUCT_ID = 'prd_AaFrLZYfcVevBwi2on-gZQ';
const SERVICE_ID = 'srv_AaFrLZYfcVevBwi2on-gZQ';

const SERVICE_ORDER = {
  id: 'ord_AaFrLZYfcVevBwi2on-gZQ',
  protocol: '100001',
  note: 'Troca de óleo e filtro',
  customer: CUSTOMER,
  products: [
    {
      productId: PRODUCT_ID,
      name: 'Tinta de Cabelo',
      unitPriceCents: 4590,
      quantity: 2,
      totalCents: 9180,
    },
  ],
  services: [
    {
      serviceId: SERVICE_ID,
      name: 'Troca de óleo',
      priceCents: 12000,
    },
  ],
  totalCents: 21180,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
  createdBy: {
    id: 'acc_AaFrLZYfcVevBwi2on-gZQ',
    name: 'João',
    email: 'joao@exemplo.com',
  },
};

describe('service-orders-api', () => {
  it('lista ordens de serviço com paginação e todos os filtros', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [SERVICE_ORDER],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    const response = await listServiceOrders(request, {
      limit: 20,
      offset: 0,
      protocol: '1000',
      customerId: CUSTOMER.id,
      productId: PRODUCT_ID,
      serviceId: SERVICE_ID,
    });

    expect(request).toHaveBeenCalledWith(
      `/service-orders?limit=20&offset=0&protocol=1000&customerId=${CUSTOMER.id}&productId=${PRODUCT_ID}&serviceId=${SERVICE_ID}`,
    );
    expect(response.data[0]).toEqual(SERVICE_ORDER);
  });

  it('omite filtros vazios da query', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [],
      meta: { limit: 20, offset: 40, total: 0 },
    });

    await listServiceOrders(request, { limit: 20, offset: 40 });

    expect(request).toHaveBeenCalledWith('/service-orders?limit=20&offset=40');
  });

  it('cria uma ordem de serviço', async () => {
    const request = vi.fn().mockResolvedValueOnce(SERVICE_ORDER);
    const input = {
      customerId: CUSTOMER.id,
      note: 'Troca de óleo e filtro',
      products: [{ productId: PRODUCT_ID, unitPriceCents: 4590, quantity: 2 }],
      services: [{ serviceId: SERVICE_ID, priceCents: 12000 }],
    };

    const order = await createServiceOrder(request, input);

    expect(request).toHaveBeenCalledWith('/service-orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(order).toEqual(SERVICE_ORDER);
  });

  it('atualiza uma ordem de serviço', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      ...SERVICE_ORDER,
      note: 'Cliente autorizou troca do filtro',
    });
    const input = { note: 'Cliente autorizou troca do filtro' };

    const order = await updateServiceOrder(request, SERVICE_ORDER.id, input);

    expect(request).toHaveBeenCalledWith(`/service-orders/${SERVICE_ORDER.id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    expect(order.note).toBe('Cliente autorizou troca do filtro');
  });

  it('exclui uma ordem de serviço', async () => {
    const request = vi.fn().mockResolvedValueOnce(undefined);

    await deleteServiceOrder(request, SERVICE_ORDER.id);

    expect(request).toHaveBeenCalledWith(`/service-orders/${SERVICE_ORDER.id}`, {
      method: 'DELETE',
    });
  });

  it('rejeita resposta fora do contrato', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [{ ...SERVICE_ORDER, totalCents: -1 }],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    await expect(listServiceOrders(request, { limit: 20, offset: 0 })).rejects.toThrow();
  });
});
