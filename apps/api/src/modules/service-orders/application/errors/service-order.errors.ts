import { AppError } from '../../../../shared/errors/app-error.js';

export class ServiceOrderNotFoundError extends AppError {
  readonly code = 'SERVICE_ORDER_NOT_FOUND';

  constructor(message = 'Ordem de serviço não encontrada') {
    super(message);
  }
}

export class ServiceOrderTenantNotFoundError extends AppError {
  readonly code = 'TENANT_NOT_FOUND';

  constructor(message = 'Tenant não encontrado') {
    super(message);
  }
}

export class ServiceOrderCustomerNotFoundError extends AppError {
  readonly code = 'CUSTOMER_NOT_FOUND';

  constructor(message = 'Cliente não encontrado') {
    super(message);
  }
}

export class ServiceOrderProductNotFoundError extends AppError {
  readonly code = 'PRODUCT_NOT_FOUND';

  constructor(message = 'Produto não encontrado') {
    super(message);
  }
}

export class ServiceOrderServiceNotFoundError extends AppError {
  readonly code = 'SERVICE_NOT_FOUND';

  constructor(message = 'Serviço não encontrado') {
    super(message);
  }
}
