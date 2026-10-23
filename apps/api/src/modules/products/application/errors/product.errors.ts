import { AppError } from '../../../../shared/errors/app-error.js';

export class ProductNotFoundError extends AppError {
  readonly code = 'PRODUCT_NOT_FOUND';

  constructor(message = 'Produto não encontrado') {
    super(message);
  }
}
