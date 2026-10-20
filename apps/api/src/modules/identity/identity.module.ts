import { Module } from '@nestjs/common';
import { AuthenticateAccountUseCase } from './application/use-cases/authenticate-account.use-case.js';
import { GetCurrentAccountUseCase } from './application/use-cases/get-current-account.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case.js';
import { RegisterTenantUseCase } from './application/use-cases/register-tenant.use-case.js';
import { PASSWORD_HASHER } from './application/ports/password-hasher.js';
import { REFRESH_TOKEN_SERVICE } from './application/ports/refresh-token-service.js';
import { TOKEN_ISSUER } from './application/ports/token-issuer.js';
import { ACCOUNT_REPOSITORY } from './domain/repositories/account.repository.js';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository.js';
import { TENANT_REPOSITORY } from './domain/repositories/tenant.repository.js';
import { Argon2PasswordHasher } from './infrastructure/auth/argon2-password-hasher.js';
import { CryptoRefreshTokenService } from './infrastructure/auth/crypto-refresh-token-service.js';
import { JoseTokenIssuer } from './infrastructure/auth/jose-token-issuer.js';
import { KnexAccountRepository } from './infrastructure/persistence/knex-account.repository.js';
import { KnexRefreshTokenRepository } from './infrastructure/persistence/knex-refresh-token.repository.js';
import { KnexTenantRepository } from './infrastructure/persistence/knex-tenant.repository.js';
import { AuthCookieService } from './presentation/http/auth-cookie.service.js';
import { AuthController } from './presentation/http/auth.controller.js';
import { JwtAuthGuard } from './presentation/http/guards/jwt-auth.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    RegisterTenantUseCase,
    AuthenticateAccountUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    GetCurrentAccountUseCase,
    { provide: TENANT_REPOSITORY, useClass: KnexTenantRepository },
    { provide: ACCOUNT_REPOSITORY, useClass: KnexAccountRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: KnexRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JoseTokenIssuer },
    { provide: REFRESH_TOKEN_SERVICE, useClass: CryptoRefreshTokenService },
    AuthCookieService,
    JwtAuthGuard,
  ],
})
export class IdentityModule {}
