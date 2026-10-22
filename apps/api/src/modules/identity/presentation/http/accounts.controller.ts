import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  PUBLIC_ID_PREFIXES,
  accountIdSchema,
  accountSchema,
  createAccountSchema,
  listAccountsQuerySchema,
  listAccountsResponseSchema,
  updateAccountSchema,
  updateAccountStatusSchema,
  type Account as AccountResponse,
  type CreateAccountInput,
  type ListAccountsQuery,
  type ListAccountsResponse,
  type UpdateAccountInput,
  type UpdateAccountStatusInput,
} from '@servico-certo/contracts';
import { CreateAccountUseCase } from '../../application/use-cases/create-account.use-case.js';
import { ListAccountsUseCase } from '../../application/use-cases/list-accounts.use-case.js';
import { UpdateAccountStatusUseCase } from '../../application/use-cases/update-account-status.use-case.js';
import { UpdateAccountUseCase } from '../../application/use-cases/update-account.use-case.js';
import { decodePublicId } from '../../../../shared/ids/public-id.js';
import { toListAccountsResponse } from './accounts.presenter.js';
import { toAccountResponse } from './auth.presenter.js';
import { CurrentAccount } from './decorators/current-account.decorator.js';
import { TenantId } from './decorators/tenant-id.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { toOpenApiSchema } from './openapi.js';
import type { AuthenticatedAccount } from './types/authenticated-request.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(
    @Inject(ListAccountsUseCase) private readonly listAccounts: ListAccountsUseCase,
    @Inject(CreateAccountUseCase) private readonly createAccount: CreateAccountUseCase,
    @Inject(UpdateAccountUseCase) private readonly updateAccount: UpdateAccountUseCase,
    @Inject(UpdateAccountStatusUseCase)
    private readonly updateAccountStatus: UpdateAccountStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma conta no tenant autenticado' })
  @ApiBody({
    schema: toOpenApiSchema(createAccountSchema),
    examples: {
      default: {
        value: {
          name: 'Maria Silva',
          email: 'maria@exemplo.com',
          password: 'senha-super-segura',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Conta criada',
    schema: toOpenApiSchema(accountSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso neste tenant' })
  async create(
    @Body(new ZodValidationPipe(createAccountSchema)) body: CreateAccountInput,
    @TenantId() tenantId: string,
  ): Promise<AccountResponse> {
    const account = await this.createAccount.execute({
      tenantId,
      name: body.name,
      email: body.email,
      password: body.password,
    });

    return toAccountResponse(account);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza nome, e-mail e/ou senha de uma conta' })
  @ApiParam({
    name: 'id',
    example: 'acc_AaFXJKFudkiOtV8yn8ts-g',
    description: 'ID público da conta',
  })
  @ApiBody({
    schema: toOpenApiSchema(updateAccountSchema),
    examples: {
      profile: {
        summary: 'Nome e e-mail',
        value: {
          name: 'Maria Souza',
          email: 'maria.souza@exemplo.com',
        },
      },
      password: {
        summary: 'Somente senha',
        value: {
          password: 'nova-senha-super-segura',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Conta atualizada',
    schema: toOpenApiSchema(accountSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Conta não encontrada' })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso neste tenant' })
  async update(
    @Param('id', new ZodValidationPipe(accountIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateAccountSchema)) body: UpdateAccountInput,
    @TenantId() tenantId: string,
  ): Promise<AccountResponse> {
    const account = await this.updateAccount.execute({
      tenantId,
      accountId: decodePublicId(PUBLIC_ID_PREFIXES.account, id),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.password !== undefined ? { password: body.password } : {}),
    });

    return toAccountResponse(account);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Bloqueia ou desbloqueia uma conta' })
  @ApiParam({
    name: 'id',
    example: 'acc_AaFXJKFudkiOtV8yn8ts-g',
    description: 'ID público da conta',
  })
  @ApiBody({
    schema: toOpenApiSchema(updateAccountStatusSchema),
    examples: {
      block: {
        summary: 'Bloquear',
        value: { status: 'BLOCKED' },
      },
      unblock: {
        summary: 'Desbloquear',
        value: { status: 'ACTIVE' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado',
    schema: toOpenApiSchema(accountSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Conta não encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Não é possível bloquear a própria conta',
  })
  async updateStatus(
    @Param('id', new ZodValidationPipe(accountIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateAccountStatusSchema))
    body: UpdateAccountStatusInput,
    @CurrentAccount() currentAccount: AuthenticatedAccount,
  ): Promise<AccountResponse> {
    const account = await this.updateAccountStatus.execute({
      tenantId: currentAccount.tenantId,
      accountId: decodePublicId(PUBLIC_ID_PREFIXES.account, id),
      status: body.status,
      requestingAccountId: currentAccount.id,
    });

    return toAccountResponse(account);
  }

  @Get()
  @ApiOperation({ summary: 'Lista as contas do tenant com paginação e filtros' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Entre 1 e 100 (padrão 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
    description: 'A partir de 0 (padrão 0)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Busca parcial e case-insensitive por nome',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Busca parcial e case-insensitive por e-mail',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de contas',
    schema: toOpenApiSchema(listAccountsResponseSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async list(
    @Query(new ZodValidationPipe(listAccountsQuerySchema)) query: ListAccountsQuery,
    @TenantId() tenantId: string,
  ): Promise<ListAccountsResponse> {
    const result = await this.listAccounts.execute({
      tenantId,
      limit: query.limit,
      offset: query.offset,
      ...(query.name ? { name: query.name } : {}),
      ...(query.email ? { email: query.email } : {}),
    });

    return toListAccountsResponse(result, {
      limit: query.limit,
      offset: query.offset,
    });
  }
}
