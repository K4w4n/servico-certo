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
  createCustomerSchema,
  customerIdSchema,
  customerSchema,
  listCustomersQuerySchema,
  listCustomersResponseSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type Customer as CustomerResponse,
  type ListCustomersQuery,
  type ListCustomersResponse,
  type UpdateCustomerInput,
} from '@servico-certo/contracts';
import { decodePublicId } from '../../../../shared/ids/public-id.js';
import { CreateCustomerUseCase } from '../../application/use-cases/create-customer.use-case.js';
import { DeleteCustomerUseCase } from '../../application/use-cases/delete-customer.use-case.js';
import { ListCustomersUseCase } from '../../application/use-cases/list-customers.use-case.js';
import { UpdateCustomerUseCase } from '../../application/use-cases/update-customer.use-case.js';
import { TenantId } from '../../../identity/presentation/http/decorators/tenant-id.decorator.js';
import { JwtAuthGuard } from '../../../identity/presentation/http/guards/jwt-auth.guard.js';
import { toOpenApiSchema } from '../../../identity/presentation/http/openapi.js';
import { ZodValidationPipe } from '../../../identity/presentation/http/zod-validation.pipe.js';
import { toCustomerResponse, toListCustomersResponse } from './customers.presenter.js';

const EXAMPLE_CUSTOMER_ID = 'cus_AaFXJKFudkiOtV8yn8ts-g';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(
    @Inject(CreateCustomerUseCase)
    private readonly createCustomer: CreateCustomerUseCase,
    @Inject(UpdateCustomerUseCase)
    private readonly updateCustomer: UpdateCustomerUseCase,
    @Inject(DeleteCustomerUseCase)
    private readonly deleteCustomer: DeleteCustomerUseCase,
    @Inject(ListCustomersUseCase)
    private readonly listCustomers: ListCustomersUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria um cliente no tenant autenticado' })
  @ApiBody({
    schema: toOpenApiSchema(createCustomerSchema),
    examples: {
      complete: {
        summary: 'Cliente com CPF',
        value: {
          name: 'Maria Silva',
          address: 'Rua das Flores, 123',
          document: '529.982.247-25',
          documentType: 'CPF',
          phoneNumber: '(11) 99999-8888',
        },
      },
      cnpj: {
        summary: 'Cliente com CNPJ',
        value: {
          name: 'Empresa Exemplo LTDA',
          address: 'Av. Paulista, 1000',
          document: '11.222.333/0001-81',
          documentType: 'CNPJ',
          phoneNumber: '(11) 3333-4444',
        },
      },
      minimal: {
        summary: 'Somente nome',
        value: {
          name: 'João Souza',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Cliente criado',
    schema: toOpenApiSchema(customerSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 409, description: 'Documento já está em uso neste tenant' })
  async create(
    @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerInput,
    @TenantId() tenantId: string,
  ): Promise<CustomerResponse> {
    const customer = await this.createCustomer.execute({
      tenantId,
      name: body.name,
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.document !== undefined ? { document: body.document } : {}),
      ...(body.documentType !== undefined ? { documentType: body.documentType } : {}),
      ...(body.phoneNumber !== undefined ? { phoneNumber: body.phoneNumber } : {}),
    });

    return toCustomerResponse(customer);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os clientes do tenant com paginação e filtros' })
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
    name: 'document',
    required: false,
    type: String,
    description: 'Busca parcial pelo documento normalizado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de clientes',
    schema: toOpenApiSchema(listCustomersResponseSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async list(
    @Query(new ZodValidationPipe(listCustomersQuerySchema)) query: ListCustomersQuery,
    @TenantId() tenantId: string,
  ): Promise<ListCustomersResponse> {
    const result = await this.listCustomers.execute({
      tenantId,
      limit: query.limit,
      offset: query.offset,
      ...(query.name ? { name: query.name } : {}),
      ...(query.document ? { document: query.document } : {}),
    });

    return toListCustomersResponse(result, {
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de um cliente' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_CUSTOMER_ID,
    description: 'ID público do cliente',
  })
  @ApiBody({
    schema: toOpenApiSchema(updateCustomerSchema),
    examples: {
      profile: {
        summary: 'Nome, endereço e telefone',
        value: {
          name: 'Maria Souza',
          address: 'Rua Nova, 456',
          phoneNumber: '(11) 98888-7777',
        },
      },
      document: {
        summary: 'Alterar documento',
        value: {
          document: '11.222.333/0001-81',
          documentType: 'CNPJ',
        },
      },
      clear: {
        summary: 'Limpar documento e endereço',
        value: {
          document: null,
          documentType: null,
          address: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cliente atualizado',
    schema: toOpenApiSchema(customerSchema, 'output'),
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  @ApiResponse({ status: 409, description: 'Documento já está em uso neste tenant' })
  async update(
    @Param('id', new ZodValidationPipe(customerIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerInput,
    @TenantId() tenantId: string,
  ): Promise<CustomerResponse> {
    const customer = await this.updateCustomer.execute({
      tenantId,
      customerId: decodePublicId(PUBLIC_ID_PREFIXES.customer, id),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.document !== undefined ? { document: body.document } : {}),
      ...(body.documentType !== undefined ? { documentType: body.documentType } : {}),
      ...(body.phoneNumber !== undefined ? { phoneNumber: body.phoneNumber } : {}),
    });

    return toCustomerResponse(customer);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclui logicamente um cliente' })
  @ApiParam({
    name: 'id',
    example: EXAMPLE_CUSTOMER_ID,
    description: 'ID público do cliente',
  })
  @ApiResponse({ status: 204, description: 'Cliente excluído' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async remove(
    @Param('id', new ZodValidationPipe(customerIdSchema)) id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    await this.deleteCustomer.execute({
      tenantId,
      customerId: decodePublicId(PUBLIC_ID_PREFIXES.customer, id),
    });
  }
}
