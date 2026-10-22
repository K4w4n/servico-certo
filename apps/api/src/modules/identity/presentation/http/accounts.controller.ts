import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  accountSchema,
  createAccountSchema,
  listAccountsQuerySchema,
  listAccountsResponseSchema,
  type Account as AccountResponse,
  type CreateAccountInput,
  type ListAccountsQuery,
  type ListAccountsResponse,
} from '@servico-certo/contracts';
import { CreateAccountUseCase } from '../../application/use-cases/create-account.use-case.js';
import { ListAccountsUseCase } from '../../application/use-cases/list-accounts.use-case.js';
import { toListAccountsResponse } from './accounts.presenter.js';
import { toAccountResponse } from './auth.presenter.js';
import { TenantId } from './decorators/tenant-id.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { toOpenApiSchema } from './openapi.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(
    @Inject(ListAccountsUseCase) private readonly listAccounts: ListAccountsUseCase,
    @Inject(CreateAccountUseCase) private readonly createAccount: CreateAccountUseCase,
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
