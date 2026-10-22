import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  listAccountsQuerySchema,
  listAccountsResponseSchema,
  type ListAccountsQuery,
  type ListAccountsResponse,
} from '@servico-certo/contracts';
import { ListAccountsUseCase } from '../../application/use-cases/list-accounts.use-case.js';
import { toListAccountsResponse } from './accounts.presenter.js';
import { TenantId } from './decorators/tenant-id.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { toOpenApiSchema } from './openapi.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(@Inject(ListAccountsUseCase) private readonly listAccounts: ListAccountsUseCase) {}

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
