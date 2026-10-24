import { ApiError } from '@/shared/lib/api-client';

const DEFAULT_MESSAGE = 'Não foi possível concluir a ação. Tente novamente.';

export function getServiceErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  switch (error.code) {
    case 'SERVICE_NOT_FOUND':
      return 'Serviço não encontrado. Atualize a lista e tente novamente.';
    case 'INVALID_SERVICE_NAME':
      return error.message || 'Nome do serviço inválido.';
    case 'INVALID_SERVICE_DESCRIPTION':
      return error.message || 'Descrição do serviço inválida.';
    case 'INVALID_PRICE':
      return error.message || 'Preço inválido.';
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
