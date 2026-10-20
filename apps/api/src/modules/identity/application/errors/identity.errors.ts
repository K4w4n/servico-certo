import { AppError } from '../../../../shared/errors/app-error.js';

export class TenantDomainAlreadyInUseError extends AppError {
  readonly code = 'TENANT_DOMAIN_TAKEN';

  constructor(message = 'Este domínio já está em uso') {
    super(message);
  }
}

export class EmailAlreadyInUseError extends AppError {
  readonly code = 'EMAIL_TAKEN';

  constructor(message = 'Este e-mail já está em uso neste tenant') {
    super(message);
  }
}

export class InvalidCredentialsError extends AppError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor(message = 'Credenciais inválidas') {
    super(message);
  }
}

export class InvalidRefreshTokenError extends AppError {
  readonly code = 'INVALID_REFRESH_TOKEN';

  constructor(message = 'Sessão inválida ou expirada') {
    super(message);
  }
}

export class WeakPasswordError extends AppError {
  readonly code = 'WEAK_PASSWORD';

  constructor(message = 'A senha não atende aos requisitos mínimos') {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Não autenticado') {
    super(message);
  }
}
