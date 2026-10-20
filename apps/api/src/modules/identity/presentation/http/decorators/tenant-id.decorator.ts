import { UnauthorizedException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

export const TenantId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.account) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Não autenticado',
      });
    }

    return request.account.tenantId;
  },
);
