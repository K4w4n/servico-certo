import { AppError } from '../../../../shared/errors/app-error.js';

export class InvalidProtocolError extends AppError {
  readonly code = 'INVALID_PROTOCOL';

  constructor(message = 'Protocolo inválido') {
    super(message);
  }
}

export class InvalidServiceOrderNoteError extends AppError {
  readonly code = 'INVALID_SERVICE_ORDER_NOTE';

  constructor(message = 'Observação da ordem de serviço inválida') {
    super(message);
  }
}

export class InvalidServiceOrderItemError extends AppError {
  readonly code = 'INVALID_SERVICE_ORDER_ITEM';

  constructor(message = 'Item da ordem de serviço inválido') {
    super(message);
  }
}

export class ServiceOrderItemsRequiredError extends AppError {
  readonly code = 'SERVICE_ORDER_ITEMS_REQUIRED';

  constructor(message = 'Informe pelo menos um produto ou serviço') {
    super(message);
  }
}
