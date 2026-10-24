import { describe, expect, it, vi } from 'vitest';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '@/modules/products/lib/products-api';

const PRODUCT = {
  id: 'prd_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Tinta de Cabelo',
  description: 'Tinta profissional castanho 60 ml',
  priceCents: 4590,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

describe('products-api', () => {
  it('lista produtos com paginação e filtro', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [PRODUCT],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    const response = await listProducts(request, {
      limit: 20,
      offset: 0,
      name: 'Tinta',
    });

    expect(request).toHaveBeenCalledWith('/products?limit=20&offset=0&name=Tinta');
    expect(response.data[0]).toEqual(PRODUCT);
  });

  it('omite o filtro vazio da query', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [],
      meta: { limit: 20, offset: 40, total: 0 },
    });

    await listProducts(request, { limit: 20, offset: 40 });

    expect(request).toHaveBeenCalledWith('/products?limit=20&offset=40');
  });

  it('cria um produto', async () => {
    const request = vi.fn().mockResolvedValueOnce(PRODUCT);
    const input = {
      name: 'Tinta de Cabelo',
      description: 'Tinta profissional castanho 60 ml',
      priceCents: 4590,
    };

    const product = await createProduct(request, input);

    expect(request).toHaveBeenCalledWith('/products', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(product).toEqual(PRODUCT);
  });

  it('atualiza um produto', async () => {
    const request = vi.fn().mockResolvedValueOnce({ ...PRODUCT, priceCents: 5990 });
    const input = { priceCents: 5990 };

    const product = await updateProduct(request, PRODUCT.id, input);

    expect(request).toHaveBeenCalledWith(`/products/${PRODUCT.id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    expect(product.priceCents).toBe(5990);
  });

  it('exclui um produto', async () => {
    const request = vi.fn().mockResolvedValueOnce(undefined);

    await deleteProduct(request, PRODUCT.id);

    expect(request).toHaveBeenCalledWith(`/products/${PRODUCT.id}`, {
      method: 'DELETE',
    });
  });

  it('rejeita resposta fora do contrato', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [{ ...PRODUCT, priceCents: -1 }],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    await expect(listProducts(request, { limit: 20, offset: 0 })).rejects.toThrow();
  });
});
