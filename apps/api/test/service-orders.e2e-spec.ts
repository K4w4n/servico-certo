import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PUBLIC_ID_PREFIXES } from '@servico-certo/contracts';
import type { Knex } from 'knex';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { KNEX } from '../src/database/database.module.js';
import { decodePublicId } from '../src/shared/ids/public-id.js';
import { runMigrations } from './helpers/migrate.js';

type RegisteredTenant = {
  accessToken: string;
  domain: string;
};

type CustomerResponse = {
  id: string;
  name: string;
};

type ProductResponse = {
  id: string;
  name: string;
  priceCents: number;
};

type ServiceResponse = {
  id: string;
  name: string;
  priceCents: number;
};

type ServiceOrderResponse = {
  id: string;
  protocol: string;
  note: string | null;
  customer: CustomerResponse & {
    address: string | null;
    document: string | null;
    documentType: string | null;
    phoneNumber: string | null;
  };
  products: Array<{
    productId: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
    totalCents: number;
  }>;
  services: Array<{
    serviceId: string;
    name: string;
    priceCents: number;
  }>;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
};

const PASSWORD = 'senha-super-segura';

describe('Service orders (e2e)', () => {
  let app: INestApplication;
  let db: Knex;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let tenantA: RegisteredTenant;
  let tenantB: RegisteredTenant;

  let customerCreate: CustomerResponse;
  let customerUpdate: CustomerResponse;
  let customerOther: CustomerResponse;
  let customerList: CustomerResponse;
  let customerDelete: CustomerResponse;
  let customerGet: CustomerResponse;
  let customerDeleted: CustomerResponse;

  let productCreate: ProductResponse;
  let productUpdate: ProductResponse;
  let productUpdateNew: ProductResponse;
  let productFrozen: ProductResponse;
  let productList: ProductResponse;
  let productDeleted: ProductResponse;

  let serviceCreate: ServiceResponse;
  let serviceUpdate: ServiceResponse;
  let serviceFrozen: ServiceResponse;
  let serviceList: ServiceResponse;
  let serviceDeleted: ServiceResponse;

  let customerB: CustomerResponse;
  let productB: ProductResponse;
  let serviceB: ServiceResponse;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    db = app.get(KNEX);
    await runMigrations(db);
    server = app.getHttpServer();

    tenantA = await registerTenant('orders-alpha', 'owner@orders-alpha.com', 'Owner Alpha');
    tenantB = await registerTenant('orders-beta', 'owner@orders-beta.com', 'Owner Beta');

    customerCreate = await createCustomer(tenantA, 'Cliente Criação');
    customerUpdate = await createCustomer(tenantA, 'Cliente Atualização');
    customerOther = await createCustomer(tenantA, 'Cliente Outro');
    customerList = await createCustomer(tenantA, 'Cliente Lista');
    customerDelete = await createCustomer(tenantA, 'Cliente Exclusão');
    customerGet = await createCustomer(tenantA, 'Cliente Busca');
    customerDeleted = await createCustomer(tenantA, 'Cliente Excluído');

    productCreate = await createProduct(tenantA, 'Produto Criação', 3500);
    productUpdate = await createProduct(tenantA, 'Produto Atualização', 1000);
    productUpdateNew = await createProduct(tenantA, 'Produto Novo', 2500);
    productFrozen = await createProduct(tenantA, 'Produto Congelado', 1000);
    productList = await createProduct(tenantA, 'Produto Lista', 700);
    productDeleted = await createProduct(tenantA, 'Produto Excluído', 500);

    serviceCreate = await createService(tenantA, 'Serviço Criação', 12000);
    serviceUpdate = await createService(tenantA, 'Serviço Atualização', 2000);
    serviceFrozen = await createService(tenantA, 'Serviço Congelado', 3000);
    serviceList = await createService(tenantA, 'Serviço Lista', 800);
    serviceDeleted = await createService(tenantA, 'Serviço Excluído', 600);

    customerB = await createCustomer(tenantB, 'Cliente Beta');
    productB = await createProduct(tenantB, 'Produto Beta', 900);
    serviceB = await createService(tenantB, 'Serviço Beta', 1100);
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerTenant(
    domain: string,
    email: string,
    name: string,
  ): Promise<RegisteredTenant> {
    const response = await request(server)
      .post('/v1/auth/register')
      .send({
        tenant: { name: domain, domain },
        account: { name, email, password: PASSWORD },
      })
      .expect(201);

    return {
      accessToken: response.body.accessToken as string,
      domain,
    };
  }

  async function createCustomer(tenant: RegisteredTenant, name: string) {
    const response = await request(server)
      .post('/v1/customers')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({ name })
      .expect(201);

    return response.body as CustomerResponse;
  }

  async function createProduct(tenant: RegisteredTenant, name: string, priceCents: number) {
    const response = await request(server)
      .post('/v1/products')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({
        name,
        description: `Descrição de ${name}`,
        priceCents,
      })
      .expect(201);

    return response.body as ProductResponse;
  }

  async function createService(tenant: RegisteredTenant, name: string, priceCents: number) {
    const response = await request(server)
      .post('/v1/services')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({
        name,
        description: `Descrição de ${name}`,
        priceCents,
      })
      .expect(201);

    return response.body as ServiceResponse;
  }

  function createOrder(tenant: RegisteredTenant, body: Record<string, unknown>) {
    return request(server)
      .post('/v1/service-orders')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  function listOrders(tenant: RegisteredTenant, query: Record<string, unknown> = {}) {
    return request(server)
      .get('/v1/service-orders')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .query(query);
  }

  function getOrder(tenant: RegisteredTenant, orderId: string) {
    return request(server)
      .get(`/v1/service-orders/${orderId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`);
  }

  function updateOrder(tenant: RegisteredTenant, orderId: string, body: Record<string, unknown>) {
    return request(server)
      .patch(`/v1/service-orders/${orderId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  function deleteOrder(tenant: RegisteredTenant, orderId: string) {
    return request(server)
      .delete(`/v1/service-orders/${orderId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`);
  }

  async function createBasicOrder(
    tenant: RegisteredTenant,
    customer: CustomerResponse,
    product: ProductResponse,
    service: ServiceResponse,
    overrides: Record<string, unknown> = {},
  ): Promise<ServiceOrderResponse> {
    const response = await createOrder(tenant, {
      customerId: customer.id,
      note: 'Observação original',
      products: [
        {
          productId: product.id,
          unitPriceCents: product.priceCents,
          quantity: 1,
        },
      ],
      services: [
        {
          serviceId: service.id,
          priceCents: service.priceCents,
        },
      ],
      ...overrides,
    }).expect(201);

    return response.body as ServiceOrderResponse;
  }

  it('cria ordem com preços personalizados e protocolo numérico', async () => {
    const response = await createOrder(tenantA, {
      customerId: customerCreate.id,
      note: '  Troca de óleo e revisão  ',
      products: [
        {
          productId: productCreate.id,
          unitPriceCents: 4000,
          quantity: 2,
        },
      ],
      services: [
        {
          serviceId: serviceCreate.id,
          priceCents: 15000,
        },
      ],
    }).expect(201);

    const body = response.body as ServiceOrderResponse;

    expect(body.id).toMatch(/^ord_[A-Za-z0-9_-]{22}$/);
    expect(body.protocol).toMatch(/^\d{6,9}$/);
    expect(body.note).toBe('Troca de óleo e revisão');
    expect(body.customer.id).toBe(customerCreate.id);
    expect(body.products).toEqual([
      {
        productId: productCreate.id,
        name: productCreate.name,
        unitPriceCents: 4000,
        quantity: 2,
        totalCents: 8000,
      },
    ]);
    expect(body.services).toEqual([
      {
        serviceId: serviceCreate.id,
        name: serviceCreate.name,
        priceCents: 15000,
      },
    ]);
    expect(body.totalCents).toBe(23000);

    const catalogProduct = await request(server)
      .get(`/v1/products/${productCreate.id}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(200);

    expect(catalogProduct.body.priceCents).toBe(3500);

    const orderUuid = decodePublicId(PUBLIC_ID_PREFIXES.serviceOrder, body.id);
    const productUuid = decodePublicId(PUBLIC_ID_PREFIXES.product, productCreate.id);
    const serviceUuid = decodePublicId(PUBLIC_ID_PREFIXES.service, serviceCreate.id);
    const productRow = (await db('service_order_products')
      .where({ service_order_id: orderUuid, product_id: productUuid })
      .first()) as
      | {
          product_name: string;
          unit_price_cents: number | string;
          quantity: number;
        }
      | undefined;
    const serviceRow = (await db('service_order_services')
      .where({ service_order_id: orderUuid, service_id: serviceUuid })
      .first()) as
      | {
          service_name: string;
          price_cents: number | string;
        }
      | undefined;

    expect(productRow?.product_name).toBe(productCreate.name);
    expect(Number(productRow?.unit_price_cents)).toBe(4000);
    expect(Number(productRow?.quantity)).toBe(2);
    expect(serviceRow?.service_name).toBe(serviceCreate.name);
    expect(Number(serviceRow?.price_cents)).toBe(15000);
  });

  it('gera protocolos sequenciais por tenant', async () => {
    const protocolAlpha = await registerTenant(
      'protocol-alpha',
      'owner@protocol-alpha.com',
      'Protocol Alpha',
    );
    const protocolBeta = await registerTenant(
      'protocol-beta',
      'owner@protocol-beta.com',
      'Protocol Beta',
    );

    const customerAlpha = await createCustomer(protocolAlpha, 'Cliente Protocolo A');
    const productAlpha = await createProduct(protocolAlpha, 'Produto Protocolo A', 1000);
    const customerBeta = await createCustomer(protocolBeta, 'Cliente Protocolo B');
    const productBeta = await createProduct(protocolBeta, 'Produto Protocolo B', 1000);

    const first = await createOrder(protocolAlpha, {
      customerId: customerAlpha.id,
      products: [{ productId: productAlpha.id, unitPriceCents: 1000, quantity: 1 }],
    }).expect(201);
    const second = await createOrder(protocolAlpha, {
      customerId: customerAlpha.id,
      products: [{ productId: productAlpha.id, unitPriceCents: 1000, quantity: 1 }],
    }).expect(201);
    const beta = await createOrder(protocolBeta, {
      customerId: customerBeta.id,
      products: [{ productId: productBeta.id, unitPriceCents: 1000, quantity: 1 }],
    }).expect(201);

    expect(first.body.protocol).toBe('100001');
    expect(second.body.protocol).toBe('100002');
    expect(beta.body.protocol).toBe('100001');
  });

  it('congela nomes de produtos e serviços no momento da criação', async () => {
    const order = await createBasicOrder(tenantA, customerGet, productFrozen, serviceFrozen);

    await request(server)
      .patch(`/v1/products/${productFrozen.id}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({ name: 'Produto Renomeado' })
      .expect(200);
    await request(server)
      .patch(`/v1/services/${serviceFrozen.id}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({ name: 'Serviço Renomeado' })
      .expect(200);

    const afterRename = await getOrder(tenantA, order.id).expect(200);

    expect(afterRename.body.products[0].name).toBe(productFrozen.name);
    expect(afterRename.body.services[0].name).toBe(serviceFrozen.name);

    const afterUpdate = await updateOrder(tenantA, order.id, {
      products: [
        {
          productId: productFrozen.id,
          unitPriceCents: 1500,
          quantity: 2,
        },
        {
          productId: productUpdateNew.id,
          unitPriceCents: productUpdateNew.priceCents,
          quantity: 1,
        },
      ],
      services: [
        {
          serviceId: serviceFrozen.id,
          priceCents: 3500,
        },
      ],
    }).expect(200);

    expect(afterUpdate.body.products).toEqual([
      {
        productId: productFrozen.id,
        name: productFrozen.name,
        unitPriceCents: 1500,
        quantity: 2,
        totalCents: 3000,
      },
      {
        productId: productUpdateNew.id,
        name: productUpdateNew.name,
        unitPriceCents: productUpdateNew.priceCents,
        quantity: 1,
        totalCents: productUpdateNew.priceCents,
      },
    ]);
    expect(afterUpdate.body.services[0].name).toBe(serviceFrozen.name);

    await request(server)
      .delete(`/v1/products/${productFrozen.id}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(204);
    await request(server)
      .delete(`/v1/services/${serviceFrozen.id}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(204);

    const afterDelete = await getOrder(tenantA, order.id).expect(200);

    expect(afterDelete.body.products[0].name).toBe(productFrozen.name);
    expect(afterDelete.body.services[0].name).toBe(serviceFrozen.name);
  });

  it('lista com paginação e filtros por protocolo, cliente, produto e serviço', async () => {
    const first = await createOrder(tenantA, {
      customerId: customerList.id,
      products: [{ productId: productList.id, unitPriceCents: 700, quantity: 1 }],
    }).expect(201);
    const second = await createOrder(tenantA, {
      customerId: customerList.id,
      services: [{ serviceId: serviceList.id, priceCents: 800 }],
    }).expect(201);
    const third = await createOrder(tenantA, {
      customerId: customerList.id,
      products: [{ productId: productList.id, unitPriceCents: 700, quantity: 2 }],
      services: [{ serviceId: serviceList.id, priceCents: 800 }],
    }).expect(201);

    const byCustomer = await listOrders(tenantA, {
      customerId: customerList.id,
      limit: 2,
      offset: 0,
    }).expect(200);

    expect(byCustomer.body.meta).toEqual({ limit: 2, offset: 0, total: 3 });
    expect(byCustomer.body.data).toHaveLength(2);

    const secondPage = await listOrders(tenantA, {
      customerId: customerList.id,
      limit: 2,
      offset: 2,
    }).expect(200);

    expect(secondPage.body.data).toHaveLength(1);

    const byProtocol = await listOrders(tenantA, {
      protocol: first.body.protocol as string,
    }).expect(200);

    expect(byProtocol.body.meta.total).toBe(1);
    expect(byProtocol.body.data[0].id).toBe(first.body.id);

    const byProduct = await listOrders(tenantA, {
      productId: productList.id,
    }).expect(200);

    expect(byProduct.body.meta.total).toBe(2);
    expect(byProduct.body.data.map((order: ServiceOrderResponse) => order.id).sort()).toEqual(
      [first.body.id, third.body.id].sort(),
    );

    const byService = await listOrders(tenantA, {
      serviceId: serviceList.id,
    }).expect(200);

    expect(byService.body.meta.total).toBe(2);
    expect(byService.body.data.map((order: ServiceOrderResponse) => order.id).sort()).toEqual(
      [second.body.id, third.body.id].sort(),
    );

    const invalidProtocol = await listOrders(tenantA, { protocol: 'abc' }).expect(400);
    expect(invalidProtocol.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('busca por ID retornando cliente, ordem, produtos e serviços', async () => {
    const order = await createBasicOrder(tenantA, customerGet, productCreate, serviceCreate);

    const response = await getOrder(tenantA, order.id).expect(200);

    expect(response.body).toMatchObject({
      id: order.id,
      protocol: order.protocol,
      note: order.note,
      customer: { id: customerGet.id, name: customerGet.name },
      products: [
        {
          productId: productCreate.id,
          name: productCreate.name,
          unitPriceCents: productCreate.priceCents,
          quantity: 1,
        },
      ],
      services: [
        {
          serviceId: serviceCreate.id,
          name: serviceCreate.name,
          priceCents: serviceCreate.priceCents,
        },
      ],
    });

    const otherTenant = await getOrder(tenantB, order.id).expect(404);
    expect(otherTenant.body.error.code).toBe('SERVICE_ORDER_NOT_FOUND');

    const invalidId = await getOrder(tenantA, 'ord_invalid').expect(400);
    expect(invalidId.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('atualiza cliente, observação, produtos e serviços', async () => {
    const order = await createBasicOrder(tenantA, customerUpdate, productUpdate, serviceUpdate);

    const response = await updateOrder(tenantA, order.id, {
      customerId: customerOther.id,
      note: null,
      products: [
        {
          productId: productUpdateNew.id,
          unitPriceCents: 9999,
          quantity: 3,
        },
      ],
      services: [],
    }).expect(200);

    expect(response.body.customer.id).toBe(customerOther.id);
    expect(response.body.note).toBeNull();
    expect(response.body.products).toEqual([
      {
        productId: productUpdateNew.id,
        name: productUpdateNew.name,
        unitPriceCents: 9999,
        quantity: 3,
        totalCents: 29997,
      },
    ]);
    expect(response.body.services).toEqual([]);
    expect(response.body.protocol).toBe(order.protocol);

    const noteOnly = await updateOrder(tenantA, order.id, {
      note: 'Nova observação',
    }).expect(200);

    expect(noteOnly.body.note).toBe('Nova observação');
    expect(noteOnly.body.products).toHaveLength(1);

    const empty = await updateOrder(tenantA, order.id, {
      products: [],
      services: [],
    }).expect(400);
    expect(empty.body.error.code).toBe('SERVICE_ORDER_ITEMS_REQUIRED');

    const protocolChange = await updateOrder(tenantA, order.id, {
      protocol: '123456',
    }).expect(400);
    expect(protocolChange.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('faz soft delete, remove da listagem e mantém itens no banco', async () => {
    const order = await createBasicOrder(tenantA, customerDelete, productCreate, serviceCreate);

    await deleteOrder(tenantA, order.id).expect(204);

    await getOrder(tenantA, order.id).expect(404);
    await updateOrder(tenantA, order.id, { note: 'Não' }).expect(404);
    await deleteOrder(tenantA, order.id).expect(404);

    const list = await listOrders(tenantA, { customerId: customerDelete.id }).expect(200);
    expect(list.body.meta.total).toBe(0);

    const orderUuid = decodePublicId(PUBLIC_ID_PREFIXES.serviceOrder, order.id);
    const row = (await db('service_orders').where({ id: orderUuid }).first()) as
      { deleted_at: string | null } | undefined;
    const products = await db('service_order_products').where({
      service_order_id: orderUuid,
    });
    const services = await db('service_order_services').where({
      service_order_id: orderUuid,
    });

    expect(row?.deleted_at).not.toBeNull();
    expect(products).toHaveLength(1);
    expect(services).toHaveLength(1);
  });

  it('rejeita ordens inválidas e itens fora do tenant', async () => {
    const noItems = await createOrder(tenantA, {
      customerId: customerCreate.id,
    }).expect(400);
    expect(noItems.body.error.code).toBe('VALIDATION_ERROR');

    const duplicateProduct = await createOrder(tenantA, {
      customerId: customerCreate.id,
      products: [
        { productId: productCreate.id, unitPriceCents: 1000, quantity: 1 },
        { productId: productCreate.id, unitPriceCents: 1000, quantity: 2 },
      ],
    }).expect(400);
    expect(duplicateProduct.body.error.code).toBe('VALIDATION_ERROR');

    const negativePrice = await createOrder(tenantA, {
      customerId: customerCreate.id,
      products: [{ productId: productCreate.id, unitPriceCents: -1, quantity: 1 }],
    }).expect(400);
    expect(negativePrice.body.error.code).toBe('VALIDATION_ERROR');

    const invalidQuantity = await createOrder(tenantA, {
      customerId: customerCreate.id,
      products: [{ productId: productCreate.id, unitPriceCents: 1000, quantity: 0 }],
    }).expect(400);
    expect(invalidQuantity.body.error.code).toBe('VALIDATION_ERROR');

    const longNote = await createOrder(tenantA, {
      customerId: customerCreate.id,
      note: 'a'.repeat(2001),
      products: [{ productId: productCreate.id, unitPriceCents: 1000, quantity: 1 }],
    }).expect(400);
    expect(longNote.body.error.code).toBe('VALIDATION_ERROR');

    const missingCustomer = await createOrder(tenantA, {
      customerId: 'cus_AaFXJKFudkiOtV8yn8ts-g',
      products: [{ productId: productCreate.id, unitPriceCents: 1000, quantity: 1 }],
    }).expect(404);
    expect(missingCustomer.body.error.code).toBe('CUSTOMER_NOT_FOUND');

    const crossTenantCustomer = await createOrder(tenantA, {
      customerId: customerB.id,
      products: [{ productId: productCreate.id, unitPriceCents: 1000, quantity: 1 }],
    }).expect(404);
    expect(crossTenantCustomer.body.error.code).toBe('CUSTOMER_NOT_FOUND');

    const crossTenantProduct = await createOrder(tenantA, {
      customerId: customerCreate.id,
      products: [{ productId: productB.id, unitPriceCents: 1000, quantity: 1 }],
    }).expect(404);
    expect(crossTenantProduct.body.error.code).toBe('PRODUCT_NOT_FOUND');

    const crossTenantService = await createOrder(tenantA, {
      customerId: customerCreate.id,
      services: [{ serviceId: serviceB.id, priceCents: 1000 }],
    }).expect(404);
    expect(crossTenantService.body.error.code).toBe('SERVICE_NOT_FOUND');

    await request(server)
      .delete(`/v1/products/${productDeleted.id}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(204);
    const deletedProduct = await createOrder(tenantA, {
      customerId: customerCreate.id,
      products: [{ productId: productDeleted.id, unitPriceCents: 1000, quantity: 1 }],
    }).expect(404);
    expect(deletedProduct.body.error.code).toBe('PRODUCT_NOT_FOUND');

    await request(server)
      .delete(`/v1/services/${serviceDeleted.id}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(204);
    const deletedService = await createOrder(tenantA, {
      customerId: customerCreate.id,
      services: [{ serviceId: serviceDeleted.id, priceCents: 1000 }],
    }).expect(404);
    expect(deletedService.body.error.code).toBe('SERVICE_NOT_FOUND');

    await request(server)
      .delete(`/v1/customers/${customerDeleted.id}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(204);
    const deletedCustomer = await createOrder(tenantA, {
      customerId: customerDeleted.id,
      products: [{ productId: productCreate.id, unitPriceCents: 1000, quantity: 1 }],
    }).expect(404);
    expect(deletedCustomer.body.error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('exige autenticação', async () => {
    const response = await request(server).get('/v1/service-orders').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
