import { AppError } from '../../../../shared/errors/app-error.js';

export class InvalidEmailError extends AppError {
  readonly code = 'INVALID_EMAIL';

  constructor(message = 'E-mail inválido') {
    super(message);
  }
}

export class InvalidTenantDomainError extends AppError {
  readonly code = 'INVALID_TENANT_DOMAIN';

  constructor(message = 'Domínio do tenant inválido') {
    super(message);
  }
}

export class InvalidTenantNameError extends AppError {
  readonly code = 'INVALID_TENANT_NAME';

  constructor(message = 'Nome do tenant inválido') {
    super(message);
  }
}

export class InvalidAccountNameError extends AppError {
  readonly code = 'INVALID_ACCOUNT_NAME';

  constructor(message = 'Nome da conta inválido') {
    super(message);
  }
}

export class InvalidPasswordHashError extends AppError {
  readonly code = 'INVALID_PASSWORD_HASH';

  constructor(message = 'Hash de senha inválido') {
    super(message);
  }
}

export class InvalidRefreshTokenDataError extends AppError {
  readonly code = 'INVALID_REFRESH_TOKEN_DATA';

  constructor(message = 'Dados do refresh token inválidos') {
    super(message);
  }
}

export class InvalidPasswordResetTokenDataError extends AppError {
  readonly code = 'INVALID_PASSWORD_RESET_TOKEN_DATA';

  constructor(message = 'Dados do token de reset inválidos') {
    super(message);
  }
}
