import { describe, expect, it } from 'vitest';
import { config } from './010_add_service_order_creator.js';

describe('010_add_service_order_creator', () => {
  it('roda fora da transação do migrator para preservar os itens no SQLite', () => {
    expect(config).toEqual({ transaction: false });
  });
});
