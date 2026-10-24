import { describe, expect, it, vi } from 'vitest';
import {
  createService,
  deleteService,
  listServices,
  updateService,
} from '@/modules/services/lib/services-api';

const SERVICE = {
  id: 'srv_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Troca de óleo',
  description: 'Troca de óleo e filtro para carro de passeio',
  priceCents: 12000,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

describe('services-api', () => {
  it('lista serviços com paginação e filtro', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [SERVICE],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    const response = await listServices(request, {
      limit: 20,
      offset: 0,
      name: 'óleo',
    });

    expect(request).toHaveBeenCalledWith('/services?limit=20&offset=0&name=%C3%B3leo');
    expect(response.data[0]).toEqual(SERVICE);
  });

  it('omite o filtro vazio da query', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [],
      meta: { limit: 20, offset: 40, total: 0 },
    });

    await listServices(request, { limit: 20, offset: 40 });

    expect(request).toHaveBeenCalledWith('/services?limit=20&offset=40');
  });

  it('cria um serviço', async () => {
    const request = vi.fn().mockResolvedValueOnce(SERVICE);
    const input = {
      name: 'Troca de óleo',
      description: 'Troca de óleo e filtro para carro de passeio',
      priceCents: 12000,
    };

    const service = await createService(request, input);

    expect(request).toHaveBeenCalledWith('/services', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(service).toEqual(SERVICE);
  });

  it('atualiza um serviço', async () => {
    const request = vi.fn().mockResolvedValueOnce({ ...SERVICE, priceCents: 15000 });
    const input = { priceCents: 15000 };

    const service = await updateService(request, SERVICE.id, input);

    expect(request).toHaveBeenCalledWith(`/services/${SERVICE.id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    expect(service.priceCents).toBe(15000);
  });

  it('exclui um serviço', async () => {
    const request = vi.fn().mockResolvedValueOnce(undefined);

    await deleteService(request, SERVICE.id);

    expect(request).toHaveBeenCalledWith(`/services/${SERVICE.id}`, {
      method: 'DELETE',
    });
  });

  it('rejeita resposta fora do contrato', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [{ ...SERVICE, priceCents: -1 }],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    await expect(listServices(request, { limit: 20, offset: 0 })).rejects.toThrow();
  });
});
