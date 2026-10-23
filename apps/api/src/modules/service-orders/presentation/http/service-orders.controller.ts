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
  createServiceOrderSchema,
  listServiceOrdersQuerySchema,
  listServiceOrdersResponseSchema,
  serviceOrderIdSchema,
  serviceOrderSchema,
  updateServiceOrderSchema,
  type CreateServiceOrderInput,
  type ListServiceOrdersQuery,
  type ListServiceOrdersResponse,
  type ServiceOrder as ServiceOrderResponse,
  type UpdateServiceOrderInput,
} from '@servico-certo/contracts';
import { decodePublicId } from '../../../../shared/ids/public-id.js';
import { CreateServiceOrderUseCase } from '../../application/use-cases/create-service-order.use-case.js';
import { DeleteServiceOrderUseCase } from '../../application/use-cases/delete-service-order.use-case.js';
import { GetServiceOrderUseCase } from '../../application/use-cases/get-service-order.use-case.js';
import { ListServiceOrdersUseCase } from '../../application/use-cases/list-service-orders.use-case.js';
import { UpdateServiceOrderUseCase } from '../../application/use-cases/update-service-order.use-case.js';
import { TenantId } from '../../../identity/presentation/http/decorators/tenant-id.decorator.js';
import { JwtAuthGuard } from '../../../identity/presentation/http/guards/jwt-auth.guard.js';
import { toOpenApiSchema } from '../../../identity/presentation/http/openapi.js';
import { ZodValidationPipe } from '../../../identity/presentation/http/zod-validation.pipe.js';
import { toListServiceOrdersResponse, toServiceOrderResponse } from './service-orders.presenter.js';

const EXAMPLE_SERVICE_ORDER_ID = 'ord_AaFXJKFudkiOtV8yn8ts-g';
const EXAMPLE_CUSTOMER_ID = 'cus_AaFXJKFudkiOtV8yn8ts-g';
const EXAMPLE_PRODUCT_ID = 'prd_AaFXJKFudkiOtV8yn8ts-g';
const EXAMPLE_SERVICE_ID = 'srv_AaFXJKFudkiOtV8yn8ts-g';

@ApiTags('service-orders')
@ApiBearerAuth()
@Controller('service-orders')
@UseGuards(JwtAuthGuard)
export class ServiceOrdersController {
  constructor(
    @Inject(CreateServiceOrderUseCase)
    private readonly createServiceOrder: CreateServiceOrderUseCase,
    @Inject(GetServiceOrderUseCase)
    private readonly getServiceOrder: GetServiceOrderUseCase,
    @Inject(UpdateServiceOrderUseCase)
    private readonly updateServiceOrder: UpdateServiceOrderUseCase,
    @Inject(DeleteServiceOrderUseCase)
    private readonly deleteServiceOrder: DeleteServiceOrderUseCase,
    @Inject(ListServiceOrdersUseCase)
    private readonly listServiceOrders: ListServiceOrdersUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma ordem de serviço no tenant autenticado' })
  @ApiBody({
    schema: toOpenApiSchema(createServiceOrderSchema),
    examples: {
      serviceOrder: {
        summary: 'Ordem com produto e serviço com preços personalizados',
        value: {
          customerId: EXAMPLE_CUSTOMER_ID,
          note: 'Troca de óleo e revisão',
          products: [
            {
              productId: EXAMPLE_PRODUCT_ID,
              unitPriceCents: 3500,
              quantity: 2,
            },
          ],
          services: [
            {
              serviceId: EXAMPLE_SERVICE_ID,
              priceCents: 12000,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Ordem de serviço criada',
    schema: toOpenApiSchema(serviceOrderSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Cliente, produto ou serviço não encontrado' })
  async create(
    @Body(new ZodValidationPipe(createServiceOrderSchema)) body: CreateServiceOrderInput,
    @TenantId() tenantId: string,
  ): Promise<ServiceOrderResponse> {
    const order = await this.createServiceOrder.execute({
      tenantId,
      customerId: decodePublicId(PUBLIC_ID_PREFIXES.customer, body.customerId),
      ...(body.note !== undefined ? { note: body.note } : {}),
      products: (body.products ?? []).map((item) => ({
        productId: decodePublicId(PUBLIC_ID_PREFIXES.product, item.productId),
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
      })),
      services: (body.services ?? []).map((item) => ({
        serviceId: decodePublicId(PUBLIC_ID_PREFIXES.service, item.serviceId),
        priceCents: item.priceCents,
      })),
    });

    return toServiceOrderResponse(order);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista ordens de serviço com paginação e filtros',
  })
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
    name: 'protocol',
    required: false,
    type: String,
    description: 'Busca parcial por protocolo numérico',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: String,
    description: 'ID público do cliente',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'ID público de um produto presente na ordem',
  })
  @ApiQuery({
    name: 'serviceId',
    required: false,
    type: String,
    description: 'ID público de um serviço presente na ordem',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de ordens de serviço',
    schema: toOpenApiSchema(listServiceOrdersResponseSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async list(
    @Query(new ZodValidationPipe(listServiceOrdersQuerySchema)) query: ListServiceOrdersQuery,
    @TenantId() tenantId: string,
  ): Promise<ListServiceOrdersResponse> {
    const result = await this.listServiceOrders.execute({
      tenantId,
      limit: query.limit,
      offset: query.offset,
      ...(query.protocol ? { protocol: query.protocol } : {}),
      ...(query.customerId
        ? { customerId: decodePublicId(PUBLIC_ID_PREFIXES.customer, query.customerId) }
        : {}),
      ...(query.productId
        ? { productId: decodePublicId(PUBLIC_ID_PREFIXES.product, query.productId) }
        : {}),
      ...(query.serviceId
        ? { serviceId: decodePublicId(PUBLIC_ID_PREFIXES.service, query.serviceId) }
        : {}),
    });

    return toListServiceOrdersResponse(result, {
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma ordem de serviço por ID' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_SERVICE_ORDER_ID,
    description: 'ID público da ordem de serviço',
  })
  @ApiResponse({
    status: 200,
    description: 'Ordem de serviço encontrada',
    schema: toOpenApiSchema(serviceOrderSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  async findById(
    @Param('id', new ZodValidationPipe(serviceOrderIdSchema)) id: string,
    @TenantId() tenantId: string,
  ): Promise<ServiceOrderResponse> {
    const order = await this.getServiceOrder.execute({
      tenantId,
      serviceOrderId: decodePublicId(PUBLIC_ID_PREFIXES.serviceOrder, id),
    });

    return toServiceOrderResponse(order);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma ordem de serviço' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_SERVICE_ORDER_ID,
    description: 'ID público da ordem de serviço',
  })
  @ApiBody({
    schema: toOpenApiSchema(updateServiceOrderSchema),
    examples: {
      details: {
        summary: 'Atualizar observação e valores dos itens',
        value: {
          note: 'Cliente autorizou troca do filtro',
          products: [
            {
              productId: EXAMPLE_PRODUCT_ID,
              unitPriceCents: 4000,
              quantity: 2,
            },
          ],
          services: [
            {
              serviceId: EXAMPLE_SERVICE_ID,
              priceCents: 13500,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ordem de serviço atualizada',
    schema: toOpenApiSchema(serviceOrderSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Ordem, cliente, produto ou serviço não encontrado' })
  async update(
    @Param('id', new ZodValidationPipe(serviceOrderIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateServiceOrderSchema)) body: UpdateServiceOrderInput,
    @TenantId() tenantId: string,
  ): Promise<ServiceOrderResponse> {
    const order = await this.updateServiceOrder.execute({
      tenantId,
      serviceOrderId: decodePublicId(PUBLIC_ID_PREFIXES.serviceOrder, id),
      ...(body.customerId !== undefined
        ? { customerId: decodePublicId(PUBLIC_ID_PREFIXES.customer, body.customerId) }
        : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.products !== undefined
        ? {
            products: body.products.map((item) => ({
              productId: decodePublicId(PUBLIC_ID_PREFIXES.product, item.productId),
              unitPriceCents: item.unitPriceCents,
              quantity: item.quantity,
            })),
          }
        : {}),
      ...(body.services !== undefined
        ? {
            services: body.services.map((item) => ({
              serviceId: decodePublicId(PUBLIC_ID_PREFIXES.service, item.serviceId),
              priceCents: item.priceCents,
            })),
          }
        : {}),
    });

    return toServiceOrderResponse(order);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclui logicamente uma ordem de serviço' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_SERVICE_ORDER_ID,
    description: 'ID público da ordem de serviço',
  })
  @ApiResponse({ status: 204, description: 'Ordem de serviço excluída logicamente' })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Ordem de serviço não encontrada' })
  async remove(
    @Param('id', new ZodValidationPipe(serviceOrderIdSchema)) id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    await this.deleteServiceOrder.execute({
      tenantId,
      serviceOrderId: decodePublicId(PUBLIC_ID_PREFIXES.serviceOrder, id),
    });
  }
}
