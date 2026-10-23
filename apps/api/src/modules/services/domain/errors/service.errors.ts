import { AppError } from '../../../../shared/errors/app-error.js';

export class InvalidServiceNameError extends AppError {
  readonly code = 'INVALID_SERVICE_NAME';

  constructor(message = 'Nome do serviço inválido') {
    super(message);
  }
}

export class InvalidServiceDescriptionError extends AppError {
  readonly code = 'INVALID_SERVICE_DESCRIPTION';

  constructor(message = 'Descrição do serviço inválida') {
    super(message);
  }
}

export class InvalidServicePriceError extends AppError {
  readonly code = 'INVALID_PRICE';

  constructor(message = 'Preço inválido') {
    super(message);
  }
}
