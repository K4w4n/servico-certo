import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, createApiClient } from '@/shared/lib/api-client';

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as Response;
}

describe('api-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('converte o envelope de erro da API em ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse(
          {
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Credenciais inválidas',
              details: [],
              path: '/v1/auth/login',
              timestamp: '2026-10-23T00:00:00.000Z',
            },
          },
          401,
        ),
      ),
    );

    await expect(apiFetch('/auth/login', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciais inválidas',
    });
  });

  it('retorna undefined para respostas 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(undefined, 204)));

    await expect(apiFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('envia o access token e tenta novamente após um 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Token inválido ou expirado',
            },
          },
          401,
        ),
      )
      .mockResolvedValueOnce(mockResponse({ ok: true }));

    vi.stubGlobal('fetch', fetchMock);

    let accessToken = 'token-antigo';
    const refresh = vi.fn(async () => {
      accessToken = 'token-novo';
      return accessToken;
    });

    const client = createApiClient({
      getAccessToken: () => accessToken,
      refresh,
    });

    await expect(client.fetch('/customers')).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const retryHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer token-novo');
  });

  it('não repete a requisição quando o refresh falha', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token inválido ou expirado',
          },
        },
        401,
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const refresh = vi.fn(async () => null);
    const client = createApiClient({
      getAccessToken: () => 'token-antigo',
      refresh,
    });

    await expect(client.fetch('/customers')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('converte falha de rede em ApiError com status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    await expect(apiFetch('/auth/login', { method: 'POST' })).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
