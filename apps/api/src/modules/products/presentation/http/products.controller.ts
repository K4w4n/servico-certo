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
  createProductSchema,
  listProductsQuerySchema,
  listProductsResponseSchema,
  productIdSchema,
  productSchema,
  updateProductSchema,
  type CreateProductInput,
  type ListProductsQuery,
  type ListProductsResponse,
  type Product as ProductResponse,
  type UpdateProductInput,
} from '@servico-certo/contracts';
import { decodePublicId } from '../../../../shared/ids/public-id.js';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case.js';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case.js';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case.js';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case.js';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case.js';
import { TenantId } from '../../../identity/presentation/http/decorators/tenant-id.decorator.js';
import { JwtAuthGuard } from '../../../identity/presentation/http/guards/jwt-auth.guard.js';
import { toOpenApiSchema } from '../../../identity/presentation/http/openapi.js';
import { ZodValidationPipe } from '../../../identity/presentation/http/zod-validation.pipe.js';
import { toListProductsResponse, toProductResponse } from './products.presenter.js';

const EXAMPLE_PRODUCT_ID = 'prd_AaFXJKFudkiOtV8yn8ts-g';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    @Inject(CreateProductUseCase)
    private readonly createProduct: CreateProductUseCase,
    @Inject(GetProductUseCase)
    private readonly getProduct: GetProductUseCase,
    @Inject(UpdateProductUseCase)
    private readonly updateProduct: UpdateProductUseCase,
    @Inject(DeleteProductUseCase)
    private readonly deleteProduct: DeleteProductUseCase,
    @Inject(ListProductsUseCase)
    private readonly listProducts: ListProductsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria um produto no tenant autenticado' })
  @ApiBody({
    schema: toOpenApiSchema(createProductSchema),
    examples: {
      service: {
        summary: 'Produto com preço em centavos',
        value: {
          name: 'Tinta de Cabelo',
          description: 'Tinta profissional castanho 60 ml',
          priceCents: 4590,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Produto criado',
    schema: toOpenApiSchema(productSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductInput,
    @TenantId() tenantId: string,
  ): Promise<ProductResponse> {
    const product = await this.createProduct.execute({
      tenantId,
      name: body.name,
      description: body.description,
      priceCents: body.priceCents,
    });

    return toProductResponse(product);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os produtos do tenant com paginação e filtro por nome' })
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
    description: 'Lista paginada de produtos',
    schema: toOpenApiSchema(listProductsResponseSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async list(
    @Query(new ZodValidationPipe(listProductsQuerySchema)) query: ListProductsQuery,
    @TenantId() tenantId: string,
  ): Promise<ListProductsResponse> {
    const result = await this.listProducts.execute({
      tenantId,
      limit: query.limit,
      offset: query.offset,
      ...(query.name ? { name: query.name } : {}),
    });

    return toListProductsResponse(result, {
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um produto por ID' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_PRODUCT_ID,
    description: 'ID público do produto',
  })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado',
    schema: toOpenApiSchema(productSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async findById(
    @Param('id', new ZodValidationPipe(productIdSchema)) id: string,
    @TenantId() tenantId: string,
  ): Promise<ProductResponse> {
    const product = await this.getProduct.execute({
      tenantId,
      productId: decodePublicId(PUBLIC_ID_PREFIXES.product, id),
    });

    return toProductResponse(product);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de um produto' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_PRODUCT_ID,
    description: 'ID público do produto',
  })
  @ApiBody({
    schema: toOpenApiSchema(updateProductSchema),
    examples: {
      price: {
        summary: 'Alterar preço (em centavos)',
        value: { priceCents: 5990 },
      },
      details: {
        summary: 'Alterar nome e descrição',
        value: {
          name: 'Tinta Premium',
          description: 'Tinta profissional com hidratação',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Produto atualizado',
    schema: toOpenApiSchema(productSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async update(
    @Param('id', new ZodValidationPipe(productIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductInput,
    @TenantId() tenantId: string,
  ): Promise<ProductResponse> {
    const product = await this.updateProduct.execute({
      tenantId,
      productId: decodePublicId(PUBLIC_ID_PREFIXES.product, id),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
    });

    return toProductResponse(product);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclui logicamente um produto' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_PRODUCT_ID,
    description: 'ID público do produto',
  })
  @ApiResponse({ status: 204, description: 'Produto excluído logicamente' })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async remove(
    @Param('id', new ZodValidationPipe(productIdSchema)) id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    await this.deleteProduct.execute({
      tenantId,
      productId: decodePublicId(PUBLIC_ID_PREFIXES.product, id),
    });
  }
}
