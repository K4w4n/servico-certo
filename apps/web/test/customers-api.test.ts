import { describe, expect, it, vi } from 'vitest';
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from '@/modules/customers/lib/customers-api';

const CUSTOMER = {
  id: 'cus_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Maria Silva',
  address: 'Rua das Flores, 123',
  document: '52998224725',
  documentType: 'CPF' as const,
  phoneNumber: '11999998888',
};

describe('customers-api', () => {
  it('lista clientes com paginação e filtros', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [CUSTOMER],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    const response = await listCustomers(request, {
      limit: 20,
      offset: 0,
      name: 'Maria',
      document: '529982',
    });

    expect(request).toHaveBeenCalledWith('/customers?limit=20&offset=0&name=Maria&document=529982');
    expect(response.data[0]).toEqual(CUSTOMER);
    expect(response.meta.total).toBe(1);
  });

  it('omite filtros vazios da query', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [],
      meta: { limit: 20, offset: 20, total: 0 },
    });

    await listCustomers(request, { limit: 20, offset: 20 });

    expect(request).toHaveBeenCalledWith('/customers?limit=20&offset=20');
  });

  it('cria um cliente', async () => {
    const request = vi.fn().mockResolvedValueOnce(CUSTOMER);
    const input = {
      name: 'Maria Silva',
      address: 'Rua das Flores, 123',
      document: '52998224725',
      documentType: 'CPF' as const,
      phoneNumber: '11999998888',
    };

    const customer = await createCustomer(request, input);

    expect(request).toHaveBeenCalledWith('/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(customer).toEqual(CUSTOMER);
  });

  it('atualiza um cliente', async () => {
    const request = vi.fn().mockResolvedValueOnce({ ...CUSTOMER, name: 'Maria Souza' });
    const input = { name: 'Maria Souza' };

    const customer = await updateCustomer(request, CUSTOMER.id, input);

    expect(request).toHaveBeenCalledWith(`/customers/${CUSTOMER.id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    expect(customer.name).toBe('Maria Souza');
  });

  it('exclui um cliente', async () => {
    const request = vi.fn().mockResolvedValueOnce(undefined);

    await deleteCustomer(request, CUSTOMER.id);

    expect(request).toHaveBeenCalledWith(`/customers/${CUSTOMER.id}`, {
      method: 'DELETE',
    });
  });

  it('rejeita resposta fora do contrato', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [{ ...CUSTOMER, id: 'id-invalido' }],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    await expect(listCustomers(request, { limit: 20, offset: 0 })).rejects.toThrow();
  });
});
