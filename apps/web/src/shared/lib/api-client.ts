const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const API_BASE_URL = `${API_URL.replace(/\/$/, '')}/v1`;

const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar à API.';
const DEFAULT_ERROR_MESSAGE = 'Não foi possível concluir a solicitação.';

type ApiErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const payload = await readBody<ApiErrorPayload>(response);
    const code =
      typeof payload?.error?.code === 'string' ? payload.error.code : `HTTP_${response.status}`;
    const message =
      typeof payload?.error?.message === 'string' ? payload.error.message : DEFAULT_ERROR_MESSAGE;

    return new ApiError(response.status, code, message, payload?.error?.details);
  }
}

export type ApiRequestOptions = RequestInit & {
  /**
   * Envia o access token no header Authorization. Padrão: true quando o client
   * possui um getter de token.
   */
  auth?: boolean;
};

export type ApiClient = {
  fetch: <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
  download: (path: string, options?: ApiRequestOptions) => Promise<DownloadedFile>;
};

export type DownloadedFile = {
  blob: Blob;
  filename: string | null;
};

export type ApiClientAuth = {
  getAccessToken?: () => string | null;
  refresh?: () => Promise<string | null>;
};

async function readBody<T>(response: Response): Promise<T | undefined> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
  }
}

/**
 * Cria um client HTTP. Quando `getAccessToken` é informado, as requisições
 * autenticadas enviam `Authorization: Bearer <token>` e, em caso de 401, o
 * token é renovado uma única vez antes de repetir a requisição.
 */
export function createApiClient(auth: ApiClientAuth = {}): ApiClient {
  async function requestResponse(
    path: string,
    options: ApiRequestOptions = {},
    canRetry = true,
  ): Promise<Response> {
    const { auth: useAuth = Boolean(auth.getAccessToken), ...init } = options;
    const token = useAuth ? auth.getAccessToken?.() : null;
    const headers = new Headers(init.headers);

    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await send(path, {
      ...init,
      credentials: 'include',
      headers,
    });

    if (response.status === 401 && canRetry && useAuth && auth.refresh) {
      const renewedToken = await auth.refresh().catch(() => null);

      if (renewedToken) {
        return requestResponse(path, options, false);
      }
    }

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    return response;
  }

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const response = await requestResponse(path, options);

    return (await readBody<T>(response)) as T;
  }

  async function download(path: string, options: ApiRequestOptions = {}): Promise<DownloadedFile> {
    const response = await requestResponse(path, options);

    return {
      blob: await response.blob(),
      filename: parseFilename(response.headers.get('Content-Disposition')),
    };
  }

  return { fetch: request, download };
}

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);

  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return encoded[1];
    }
  }

  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);

  return plain?.[1]?.trim() ?? null;
}

/**
 * Client sem autenticação, usado nas rotas de login/refresh/logout.
 */
export const apiFetch = createApiClient().fetch;
