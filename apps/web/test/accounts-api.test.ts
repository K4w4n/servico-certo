import { describe, expect, it, vi } from 'vitest';
import {
  createAccount,
  listAccounts,
  updateAccount,
  updateAccountStatus,
} from '@/modules/identity/lib/accounts-api';

const ACCOUNT = {
  id: 'acc_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Maria Souza',
  email: 'maria@exemplo.com',
  status: 'ACTIVE' as const,
};

describe('accounts-api', () => {
  it('lista contas com paginação e filtros', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [ACCOUNT],
      meta: { limit: 20, offset: 20, total: 21 },
    });

    const response = await listAccounts(request, {
      limit: 20,
      offset: 20,
      name: 'Maria',
      email: 'maria@exemplo.com',
    });

    expect(request).toHaveBeenCalledWith(
      '/accounts?limit=20&offset=20&name=Maria&email=maria%40exemplo.com',
    );
    expect(response.data[0]).toEqual(ACCOUNT);
    expect(response.meta.total).toBe(21);
  });

  it('omite filtros vazios da query', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [],
      meta: { limit: 20, offset: 0, total: 0 },
    });

    await listAccounts(request, { limit: 20, offset: 0 });

    expect(request).toHaveBeenCalledWith('/accounts?limit=20&offset=0');
  });

  it('cria uma conta', async () => {
    const request = vi.fn().mockResolvedValueOnce(ACCOUNT);
    const input = {
      name: 'Maria Souza',
      email: 'maria@exemplo.com',
      password: 'senha-super-segura',
    };

    const account = await createAccount(request, input);

    expect(request).toHaveBeenCalledWith('/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(account).toEqual(ACCOUNT);
  });

  it('atualiza os dados de uma conta', async () => {
    const request = vi.fn().mockResolvedValueOnce({ ...ACCOUNT, name: 'Maria Silva' });
    const input = { name: 'Maria Silva' };

    const account = await updateAccount(request, ACCOUNT.id, input);

    expect(request).toHaveBeenCalledWith(`/accounts/${ACCOUNT.id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    expect(account.name).toBe('Maria Silva');
  });

  it('atualiza o status de uma conta', async () => {
    const request = vi.fn().mockResolvedValueOnce({ ...ACCOUNT, status: 'BLOCKED' });

    const account = await updateAccountStatus(request, ACCOUNT.id, { status: 'BLOCKED' });

    expect(request).toHaveBeenCalledWith(`/accounts/${ACCOUNT.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'BLOCKED' }),
    });
    expect(account.status).toBe('BLOCKED');
  });

  it('rejeita resposta fora do contrato', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      data: [{ ...ACCOUNT, id: 'id-invalido' }],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    await expect(listAccounts(request, { limit: 20, offset: 0 })).rejects.toThrow();
  });
});
