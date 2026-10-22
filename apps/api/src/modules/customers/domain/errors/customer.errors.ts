import { AppError } from '../../../../shared/errors/app-error.js';

export class InvalidCustomerNameError extends AppError {
  readonly code = 'INVALID_CUSTOMER_NAME';

  constructor(message = 'Nome do cliente inválido') {
    super(message);
  }
}

export class InvalidAddressError extends AppError {
  readonly code = 'INVALID_ADDRESS';

  constructor(message = 'Endereço do cliente inválido') {
    super(message);
  }
}

export class InvalidDocumentError extends AppError {
  readonly code = 'INVALID_DOCUMENT';

  constructor(message = 'Documento inválido') {
    super(message);
  }
}

export class InvalidPhoneNumberError extends AppError {
  readonly code = 'INVALID_PHONE_NUMBER';

  constructor(message = 'Telefone inválido') {
    super(message);
  }
}
