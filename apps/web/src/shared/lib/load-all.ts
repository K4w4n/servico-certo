import type { ApiClient } from './api-client';

type Page<T> = {
  data: T[];
  meta: {
    total: number;
  };
};

export type PageLoader<T> = (
  request: ApiClient['fetch'],
  query: { limit: number; offset: number },
) => Promise<Page<T>>;

const PAGE_SIZE = 100;

export async function loadAllPages<T>(
  request: ApiClient['fetch'],
  loadPage: PageLoader<T>,
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;

  for (;;) {
    const page = await loadPage(request, { limit: PAGE_SIZE, offset });

    items.push(...page.data);
    offset += page.data.length;

    if (page.data.length === 0 || offset >= page.meta.total) {
      return items;
    }
  }
}
