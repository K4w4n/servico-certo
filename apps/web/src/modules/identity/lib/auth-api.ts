import {
  authResponseSchema,
  type AuthResponse,
  type LoginInput,
  type RegisterTenantInput,
} from '@servico-certo/contracts';
import { apiFetch } from '@/shared/lib/api-client';

function parseAuthResponse(payload: unknown): AuthResponse {
  return authResponseSchema.parse(payload);
}

export async function register(input: RegisterTenantInput): Promise<AuthResponse> {
  const payload = await apiFetch<unknown>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return parseAuthResponse(payload);
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const payload = await apiFetch<unknown>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return parseAuthResponse(payload);
}

export async function refreshSession(): Promise<AuthResponse> {
  const payload = await apiFetch<unknown>('/auth/refresh', {
    method: 'POST',
  });

  return parseAuthResponse(payload);
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/auth/logout', {
    method: 'POST',
  });
}
