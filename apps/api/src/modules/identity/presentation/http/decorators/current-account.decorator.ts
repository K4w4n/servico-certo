import { UnauthorizedException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedAccount, AuthenticatedRequest } from '../types/authenticated-request.js';

export const CurrentAccount = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedAccount => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.account) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Não autenticado',
      });
    }

    return request.account;
  },
);
