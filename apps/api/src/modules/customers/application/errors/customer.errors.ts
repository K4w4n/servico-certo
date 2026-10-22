import { AppError } from '../../../../shared/errors/app-error.js';

export class CustomerNotFoundError extends AppError {
  readonly code = 'CUSTOMER_NOT_FOUND';

  constructor(message = 'Cliente não encontrado') {
    super(message);
  }
}

export class DocumentAlreadyInUseError extends AppError {
  readonly code = 'DOCUMENT_TAKEN';

  constructor(message = 'Este documento já está em uso neste tenant') {
    super(message);
  }
}
