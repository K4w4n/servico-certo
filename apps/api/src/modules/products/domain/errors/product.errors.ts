import { AppError } from '../../../../shared/errors/app-error.js';

export class InvalidProductNameError extends AppError {
  readonly code = 'INVALID_PRODUCT_NAME';

  constructor(message = 'Nome do produto inválido') {
    super(message);
  }
}

export class InvalidProductDescriptionError extends AppError {
  readonly code = 'INVALID_PRODUCT_DESCRIPTION';

  constructor(message = 'Descrição do produto inválida') {
    super(message);
  }
}

export class InvalidPriceError extends AppError {
  readonly code = 'INVALID_PRICE';

  constructor(message = 'Preço inválido') {
    super(message);
  }
}
