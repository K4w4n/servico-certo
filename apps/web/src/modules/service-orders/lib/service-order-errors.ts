import { ApiError } from '@/shared/lib/api-client';

const DEFAULT_MESSAGE = 'Não foi possível concluir a ação. Tente novamente.';

export function getServiceOrderErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  switch (error.code) {
    case 'SERVICE_ORDER_NOT_FOUND':
      return 'Ordem de serviço não encontrada. Atualize a lista e tente novamente.';
    case 'CUSTOMER_NOT_FOUND':
      return 'Cliente não encontrado. Selecione outro cliente e tente novamente.';
    case 'PRODUCT_NOT_FOUND':
      return 'Produto não encontrado. Atualize a lista e tente novamente.';
    case 'SERVICE_NOT_FOUND':
      return 'Serviço não encontrado. Atualize a lista e tente novamente.';
    case 'SERVICE_ORDER_ITEMS_REQUIRED':
      return 'Informe pelo menos um produto ou serviço.';
    case 'INVALID_SERVICE_ORDER_NOTE':
      return error.message || 'Observação inválida.';
    case 'INVALID_SERVICE_ORDER_ITEM':
      return error.message || 'Item da ordem inválido.';
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
