import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  createServiceSchema,
  listServicesQuerySchema,
  listServicesResponseSchema,
  serviceIdSchema,
  serviceSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type ListServicesQuery,
  type ListServicesResponse,
  type Service as ServiceResponse,
  type UpdateServiceInput,
} from '@servico-certo/contracts';
import { decodePublicId } from '../../../../shared/ids/public-id.js';
import { CreateServiceUseCase } from '../../application/use-cases/create-service.use-case.js';
import { DeleteServiceUseCase } from '../../application/use-cases/delete-service.use-case.js';
import { GetServiceUseCase } from '../../application/use-cases/get-service.use-case.js';
import { ListServicesUseCase } from '../../application/use-cases/list-services.use-case.js';
import { UpdateServiceUseCase } from '../../application/use-cases/update-service.use-case.js';
import { TenantId } from '../../../identity/presentation/http/decorators/tenant-id.decorator.js';
import { JwtAuthGuard } from '../../../identity/presentation/http/guards/jwt-auth.guard.js';
import { toOpenApiSchema } from '../../../identity/presentation/http/openapi.js';
import { ZodValidationPipe } from '../../../identity/presentation/http/zod-validation.pipe.js';
import { toListServicesResponse, toServiceResponse } from './services.presenter.js';

const EXAMPLE_SERVICE_ID = 'srv_AaFXJKFudkiOtV8yn8ts-g';

@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(
    @Inject(CreateServiceUseCase)
    private readonly createService: CreateServiceUseCase,
    @Inject(GetServiceUseCase)
    private readonly getService: GetServiceUseCase,
    @Inject(UpdateServiceUseCase)
    private readonly updateService: UpdateServiceUseCase,
    @Inject(DeleteServiceUseCase)
    private readonly deleteService: DeleteServiceUseCase,
    @Inject(ListServicesUseCase)
    private readonly listServices: ListServicesUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria um serviço no tenant autenticado' })
  @ApiBody({
    schema: toOpenApiSchema(createServiceSchema),
    examples: {
      service: {
        summary: 'Serviço com preço em centavos',
        value: {
          name: 'Troca de Óleo',
          description: 'Troca de óleo e filtro para carro de passeio',
          priceCents: 12000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Serviço criado',
    schema: toOpenApiSchema(serviceSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(
    @Body(new ZodValidationPipe(createServiceSchema)) body: CreateServiceInput,
    @TenantId() tenantId: string,
  ): Promise<ServiceResponse> {
    const service = await this.createService.execute({
      tenantId,
      name: body.name,
      description: body.description,
      priceCents: body.priceCents,
    });

    return toServiceResponse(service);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os serviços do tenant com paginação e filtro por nome' })
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
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de serviços',
    schema: toOpenApiSchema(listServicesResponseSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async list(
    @Query(new ZodValidationPipe(listServicesQuerySchema)) query: ListServicesQuery,
    @TenantId() tenantId: string,
  ): Promise<ListServicesResponse> {
    const result = await this.listServices.execute({
      tenantId,
      limit: query.limit,
      offset: query.offset,
      ...(query.name ? { name: query.name } : {}),
    });

    return toListServicesResponse(result, {
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um serviço por ID' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_SERVICE_ID,
    description: 'ID público do serviço',
  })
  @ApiResponse({
    status: 200,
    description: 'Serviço encontrado',
    schema: toOpenApiSchema(serviceSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async findById(
    @Param('id', new ZodValidationPipe(serviceIdSchema)) id: string,
    @TenantId() tenantId: string,
  ): Promise<ServiceResponse> {
    const service = await this.getService.execute({
      tenantId,
      serviceId: decodePublicId(PUBLIC_ID_PREFIXES.service, id),
    });

    return toServiceResponse(service);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de um serviço' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_SERVICE_ID,
    description: 'ID público do serviço',
  })
  @ApiBody({
    schema: toOpenApiSchema(updateServiceSchema),
    examples: {
      price: {
        summary: 'Alterar preço (em centavos)',
        value: { priceCents: 15000 },
      },
      details: {
        summary: 'Alterar nome e descrição',
        value: {
          name: 'Troca de Óleo Premium',
          description: 'Troca de óleo sintético e filtro',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Serviço atualizado',
    schema: toOpenApiSchema(serviceSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async update(
    @Param('id', new ZodValidationPipe(serviceIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) body: UpdateServiceInput,
    @TenantId() tenantId: string,
  ): Promise<ServiceResponse> {
    const service = await this.updateService.execute({
      tenantId,
      serviceId: decodePublicId(PUBLIC_ID_PREFIXES.service, id),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
    });

    return toServiceResponse(service);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclui logicamente um serviço' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_SERVICE_ID,
    description: 'ID público do serviço',
  })
  @ApiResponse({ status: 204, description: 'Serviço excluído logicamente' })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async remove(
    @Param('id', new ZodValidationPipe(serviceIdSchema)) id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    await this.deleteService.execute({
      tenantId,
      serviceId: decodePublicId(PUBLIC_ID_PREFIXES.service, id),
    });
  }
}
