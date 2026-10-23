import { AppError } from '../../../../shared/errors/app-error.js';

export class ServiceNotFoundError extends AppError {
  readonly code = 'SERVICE_NOT_FOUND';

  constructor(message = 'Serviço não encontrado') {
    super(message);
  }
}
