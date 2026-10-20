import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  authResponseSchema,
  currentAccountResponseSchema,
  loginSchema,
  registerTenantSchema,
  type AuthResponse,
  type CurrentAccountResponse,
  type LoginInput,
  type RegisterTenantInput,
} from '@servico-certo/contracts';
import type { Request, Response } from 'express';
import { AuthenticateAccountUseCase } from '../../application/use-cases/authenticate-account.use-case.js';
import { GetCurrentAccountUseCase } from '../../application/use-cases/get-current-account.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case.js';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case.js';
import { RegisterTenantUseCase } from '../../application/use-cases/register-tenant.use-case.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { CurrentAccount } from './decorators/current-account.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { toAuthResponse, toCurrentAccountResponse } from './auth.presenter.js';
import { toOpenApiSchema } from './openapi.js';
import type { AuthenticatedAccount } from './types/authenticated-request.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(RegisterTenantUseCase)
    private readonly registerTenant: RegisterTenantUseCase,
    @Inject(AuthenticateAccountUseCase)
    private readonly authenticateAccount: AuthenticateAccountUseCase,
    @Inject(RefreshSessionUseCase)
    private readonly refreshSession: RefreshSessionUseCase,
    @Inject(LogoutUseCase) private readonly logout: LogoutUseCase,
    @Inject(GetCurrentAccountUseCase)
    private readonly getCurrentAccount: GetCurrentAccountUseCase,
    @Inject(AuthCookieService) private readonly cookies: AuthCookieService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Cria um tenant e a primeira conta' })
  @ApiBody({
    schema: toOpenApiSchema(registerTenantSchema),
    examples: {
      default: {
        value: {
          tenant: {
            name: 'Oficina do João',
            domain: 'oficina-do-joao',
          },
          account: {
            name: 'João',
            email: 'joao@exemplo.com',
            password: 'senha-super-segura',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant e primeira conta criados',
    schema: toOpenApiSchema(authResponseSchema, 'output'),
  })
  async register(
    @Body(new ZodValidationPipe(registerTenantSchema)) body: RegisterTenantInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const session = await this.registerTenant.execute({
      tenantName: body.tenant.name,
      tenantDomain: body.tenant.domain,
      accountName: body.account.name,
      email: body.account.email,
      password: body.account.password,
    });

    this.cookies.setRefreshToken(response, session.refreshToken);

    return toAuthResponse(session);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autentica uma conta em um tenant' })
  @ApiBody({
    schema: toOpenApiSchema(loginSchema),
    examples: {
      default: {
        value: {
          tenantDomain: 'oficina-do-joao',
          email: 'joao@exemplo.com',
          password: 'senha-super-segura',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão criada',
    schema: toOpenApiSchema(authResponseSchema, 'output'),
  })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const session = await this.authenticateAccount.execute({
      tenantDomain: body.tenantDomain,
      email: body.email,
      password: body.password,
    });

    this.cookies.setRefreshToken(response, session.refreshToken);

    return toAuthResponse(session);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Rotaciona a sessão usando o refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Sessão rotacionada',
    schema: toOpenApiSchema(authResponseSchema, 'output'),
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const session = await this.refreshSession.execute({
      refreshToken: this.cookies.readRefreshToken(request),
    });

    this.cookies.setRefreshToken(response, session.refreshToken);

    return toAuthResponse(session);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Encerra a sessão atual' })
  @ApiResponse({ status: 204, description: 'Sessão encerrada' })
  async logoutCurrentSession(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.logout.execute(this.cookies.readRefreshToken(request));
    this.cookies.clearRefreshToken(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna a conta e o tenant do token atual' })
  @ApiResponse({
    status: 200,
    description: 'Conta e tenant atuais',
    schema: toOpenApiSchema(currentAccountResponseSchema, 'output'),
  })
  async me(@CurrentAccount() account: AuthenticatedAccount): Promise<CurrentAccountResponse> {
    const result = await this.getCurrentAccount.execute({
      accountId: account.id,
      tenantId: account.tenantId,
    });

    return toCurrentAccountResponse(result);
  }
}
