import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MAILER, type Mailer } from './application/ports/mailer.js';
import { PASSWORD_HASHER } from './application/ports/password-hasher.js';
import { PASSWORD_RESET_TOKEN_SERVICE } from './application/ports/password-reset-token-service.js';
import { REFRESH_TOKEN_SERVICE } from './application/ports/refresh-token-service.js';
import { TOKEN_ISSUER } from './application/ports/token-issuer.js';
import { AuthenticateAccountUseCase } from './application/use-cases/authenticate-account.use-case.js';
import { CreateAccountUseCase } from './application/use-cases/create-account.use-case.js';
import { GetCurrentAccountUseCase } from './application/use-cases/get-current-account.use-case.js';
import { ListAccountsUseCase } from './application/use-cases/list-accounts.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case.js';
import { RegisterTenantUseCase } from './application/use-cases/register-tenant.use-case.js';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case.js';
import { UpdateAccountStatusUseCase } from './application/use-cases/update-account-status.use-case.js';
import { UpdateAccountUseCase } from './application/use-cases/update-account.use-case.js';
import { ValidatePasswordResetTokenUseCase } from './application/use-cases/validate-password-reset-token.use-case.js';
import { ACCOUNT_REPOSITORY } from './domain/repositories/account.repository.js';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from './domain/repositories/password-reset-token.repository.js';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository.js';
import { TENANT_REPOSITORY } from './domain/repositories/tenant.repository.js';
import { Argon2PasswordHasher } from './infrastructure/auth/argon2-password-hasher.js';
import { CryptoPasswordResetTokenService } from './infrastructure/auth/crypto-password-reset-token-service.js';
import { CryptoRefreshTokenService } from './infrastructure/auth/crypto-refresh-token-service.js';
import { JoseTokenIssuer } from './infrastructure/auth/jose-token-issuer.js';
import { ConsoleMailer } from './infrastructure/mail/console-mailer.js';
import { SmtpMailer } from './infrastructure/mail/smtp-mailer.js';
import { KnexAccountRepository } from './infrastructure/persistence/knex-account.repository.js';
import { KnexPasswordResetTokenRepository } from './infrastructure/persistence/knex-password-reset-token.repository.js';
import { KnexRefreshTokenRepository } from './infrastructure/persistence/knex-refresh-token.repository.js';
import { KnexTenantRepository } from './infrastructure/persistence/knex-tenant.repository.js';
import { AccountsController } from './presentation/http/accounts.controller.js';
import { AuthCookieService } from './presentation/http/auth-cookie.service.js';
import { AuthController } from './presentation/http/auth.controller.js';
import { JwtAuthGuard } from './presentation/http/guards/jwt-auth.guard.js';
import { PasswordResetController } from './presentation/http/password-reset.controller.js';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.getOrThrow('PASSWORD_RESET_RATE_WINDOW_MINUTES')) * 60_000,
          limit: Number(config.getOrThrow('PASSWORD_RESET_RATE_LIMIT')),
        },
      ],
    }),
  ],
  controllers: [AuthController, PasswordResetController, AccountsController],
  providers: [
    RegisterTenantUseCase,
    AuthenticateAccountUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    GetCurrentAccountUseCase,
    CreateAccountUseCase,
    UpdateAccountUseCase,
    UpdateAccountStatusUseCase,
    ListAccountsUseCase,
    RequestPasswordResetUseCase,
    ValidatePasswordResetTokenUseCase,
    ResetPasswordUseCase,
    { provide: TENANT_REPOSITORY, useClass: KnexTenantRepository },
    { provide: ACCOUNT_REPOSITORY, useClass: KnexAccountRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: KnexRefreshTokenRepository },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: KnexPasswordResetTokenRepository,
    },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JoseTokenIssuer },
    { provide: REFRESH_TOKEN_SERVICE, useClass: CryptoRefreshTokenService },
    { provide: PASSWORD_RESET_TOKEN_SERVICE, useClass: CryptoPasswordResetTokenService },
    {
      provide: MAILER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Mailer => {
        const transport = config.get<string>('MAIL_TRANSPORT') ?? 'console';

        return transport === 'smtp' ? new SmtpMailer(config) : new ConsoleMailer(config);
      },
    },
    AuthCookieService,
    JwtAuthGuard,
    ThrottlerGuard,
  ],
  exports: [JwtAuthGuard, TOKEN_ISSUER, ACCOUNT_REPOSITORY, TENANT_REPOSITORY],
})
export class IdentityModule {}
