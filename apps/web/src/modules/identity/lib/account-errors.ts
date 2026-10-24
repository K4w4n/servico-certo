import { ApiError } from '@/shared/lib/api-client';

const DEFAULT_MESSAGE = 'Não foi possível concluir a ação. Tente novamente.';

export function getAccountErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  switch (error.code) {
    case 'EMAIL_TAKEN':
      return 'Este e-mail já está em uso neste tenant.';
    case 'ACCOUNT_NOT_FOUND':
      return 'Usuário não encontrado. Atualize a lista e tente novamente.';
    case 'CANNOT_BLOCK_SELF':
      return 'Você não pode bloquear sua própria conta.';
    case 'WEAK_PASSWORD':
      return 'A senha deve ter entre 10 e 128 caracteres.';
    case 'VALIDATION_ERROR':
      return 'Verifique os dados informados e tente novamente.';
    default:
      if (error.status === 0) {
        return 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.';
      }

      if (error.status === 429) {
        return 'Muitas solicitações. Aguarde alguns instantes e tente novamente.';
      }

      return fallback;
  }
}

export function isEmailTakenError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'EMAIL_TAKEN';
}
