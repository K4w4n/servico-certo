import { describe, expect, it, vi } from 'vitest';
import { loadAllPages } from '@/shared/lib/load-all';

const request = vi.fn() as unknown as Parameters<typeof loadAllPages>[0];

describe('load-all', () => {
  it('carrega todas as páginas até alcançar o total', async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }], meta: { total: 3 } })
      .mockResolvedValueOnce({ data: [{ id: 3 }], meta: { total: 3 } });

    const items = await loadAllPages(
      request,
      loadPage as unknown as Parameters<typeof loadAllPages>[1],
    );

    expect(items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(loadPage).toHaveBeenNthCalledWith(1, request, { limit: 100, offset: 0 });
    expect(loadPage).toHaveBeenNthCalledWith(2, request, { limit: 100, offset: 2 });
  });

  it('para quando a página vem vazia', async () => {
    const loadPage = vi.fn().mockResolvedValueOnce({ data: [], meta: { total: 10 } });

    const items = await loadAllPages(
      request,
      loadPage as unknown as Parameters<typeof loadAllPages>[1],
    );

    expect(items).toEqual([]);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });
});
