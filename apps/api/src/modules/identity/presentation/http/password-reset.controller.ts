import { Body, Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  passwordResetContextSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  validatePasswordResetTokenSchema,
  type PasswordResetContext,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
  type ValidatePasswordResetTokenInput,
} from '@servico-certo/contracts';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case.js';
import { ValidatePasswordResetTokenUseCase } from '../../application/use-cases/validate-password-reset-token.use-case.js';
import { toOpenApiSchema } from './openapi.js';
import { toPasswordResetContextResponse } from './password-reset.presenter.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const EXAMPLE_RESET_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

@ApiTags('auth')
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(
    @Inject(RequestPasswordResetUseCase)
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    @Inject(ValidatePasswordResetTokenUseCase)
    private readonly validatePasswordResetToken: ValidatePasswordResetTokenUseCase,
    @Inject(ResetPasswordUseCase)
    private readonly resetPassword: ResetPasswordUseCase,
  ) {}

  @Post('request')
  @HttpCode(204)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Solicita o envio de um link de reset de senha' })
  @ApiBody({
    schema: toOpenApiSchema(requestPasswordResetSchema),
    examples: {
      default: {
        value: {
          tenantDomain: 'oficina-do-joao',
          email: 'joao@exemplo.com',
        },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Solicitação processada' })
  @ApiResponse({ status: 429, description: 'Muitas solicitações em pouco tempo' })
  async request(
    @Body(new ZodValidationPipe(requestPasswordResetSchema))
    body: RequestPasswordResetInput,
  ): Promise<void> {
    await this.requestPasswordReset.execute({
      tenantDomain: body.tenantDomain,
      email: body.email,
    });
  }

  @Post('validate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Valida o token de reset e retorna conta e tenant' })
  @ApiBody({
    schema: toOpenApiSchema(validatePasswordResetTokenSchema),
    examples: {
      default: {
        value: {
          token: EXAMPLE_RESET_TOKEN,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token válido',
    schema: toOpenApiSchema(passwordResetContextSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async validate(
    @Body(new ZodValidationPipe(validatePasswordResetTokenSchema))
    body: ValidatePasswordResetTokenInput,
  ): Promise<PasswordResetContext> {
    const context = await this.validatePasswordResetToken.execute({
      token: body.token,
    });

    return toPasswordResetContextResponse(context);
  }

  @Post('confirm')
  @HttpCode(204)
  @ApiOperation({ summary: 'Define a nova senha usando o token de reset' })
  @ApiBody({
    schema: toOpenApiSchema(resetPasswordSchema),
    examples: {
      default: {
        value: {
          token: EXAMPLE_RESET_TOKEN,
          password: 'nova-senha-segura',
        },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Senha redefinida' })
  @ApiResponse({ status: 400, description: 'Token inválido ou senha fraca' })
  async confirm(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<void> {
    await this.resetPassword.execute({
      token: body.token,
      password: body.password,
    });
  }
}
