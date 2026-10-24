import {
  authResponseSchema,
  passwordResetContextSchema,
  type AuthResponse,
  type LoginInput,
  type PasswordResetContext,
  type RegisterTenantInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
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

export async function requestPasswordReset(input: RequestPasswordResetInput): Promise<void> {
  await apiFetch<void>('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function validatePasswordResetToken(token: string): Promise<PasswordResetContext> {
  const payload = await apiFetch<unknown>('/auth/password-reset/validate', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

  return passwordResetContextSchema.parse(payload);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await apiFetch<void>('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
