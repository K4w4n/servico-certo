import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { TOKEN_ISSUER, type TokenIssuer } from '../../../application/ports/token-issuer.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../../../domain/repositories/account.repository.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token de acesso ausente',
      });
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token de acesso ausente',
      });
    }

    const payload = await this.tokenIssuer.verify(token).catch(() => {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token inválido ou expirado',
      });
    });

    const account = await this.accounts.findById(payload.accountId);

    if (!account || account.tenantId !== payload.tenantId) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Conta não encontrada',
      });
    }

    if (account.isBlocked) {
      throw new ForbiddenException({
        code: 'ACCOUNT_BLOCKED',
        message: 'Conta bloqueada',
      });
    }

    request.account = {
      id: account.id,
      tenantId: account.tenantId,
    };

    return true;
  }
}
