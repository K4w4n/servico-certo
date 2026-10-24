import { ApiError } from '@/shared/lib/api-client';

const DEFAULT_MESSAGE = 'Não foi possível concluir a ação. Tente novamente.';

export function getCustomerErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  switch (error.code) {
    case 'DOCUMENT_TAKEN':
      return 'Este documento já está em uso neste tenant.';
    case 'CUSTOMER_NOT_FOUND':
      return 'Cliente não encontrado. Atualize a lista e tente novamente.';
    case 'INVALID_DOCUMENT':
      return error.message || 'Documento inválido.';
    case 'INVALID_PHONE_NUMBER':
      return error.message || 'Telefone inválido.';
    case 'INVALID_CUSTOMER_NAME':
      return error.message || 'Nome do cliente inválido.';
    case 'INVALID_ADDRESS':
      return error.message || 'Endereço do cliente inválido.';
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

export function isDocumentTakenError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'DOCUMENT_TAKEN';
}
