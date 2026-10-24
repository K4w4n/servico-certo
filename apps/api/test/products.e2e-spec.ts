import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Knex } from 'knex';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { KNEX } from '../src/database/database.module.js';
import { runMigrations } from './helpers/migrate.js';

type RegisteredTenant = {
  accessToken: string;
  domain: string;
};

type ProductResponse = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  createdAt: string;
  updatedAt: string;
};

const PASSWORD = 'senha-super-segura';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let db: Knex;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let tenantA: RegisteredTenant;
  let tenantB: RegisteredTenant;

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

    tenantA = await registerTenant('products-alpha', 'owner@products-alpha.com', 'Owner Alpha');
    tenantB = await registerTenant('products-beta', 'owner@products-beta.com', 'Owner Beta');
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

  function createProduct(tenant: RegisteredTenant, body: Record<string, unknown>) {
    return request(server)
      .post('/v1/products')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  function listProducts(tenant: RegisteredTenant, query: Record<string, unknown> = {}) {
    return request(server)
      .get('/v1/products')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .query(query);
  }

  function getProduct(tenant: RegisteredTenant, productId: string) {
    return request(server)
      .get(`/v1/products/${productId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`);
  }

  function updateProduct(
    tenant: RegisteredTenant,
    productId: string,
    body: Record<string, unknown>,
  ) {
    return request(server)
      .patch(`/v1/products/${productId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  function deleteProduct(tenant: RegisteredTenant, productId: string) {
    return request(server)
      .delete(`/v1/products/${productId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`);
  }

  it('cria produto e normaliza nome e descrição', async () => {
    const response = await createProduct(tenantA, {
      name: '  Tinta   de Cabelo  ',
      description: '  Tinta profissional castanho 60 ml  ',
      priceCents: 4590,
    }).expect(201);

    const body = response.body as ProductResponse;

    expect(body.id).toMatch(/^prd_[A-Za-z0-9_-]{22}$/);
    expect(body.name).toBe('Tinta de Cabelo');
    expect(body.description).toBe('Tinta profissional castanho 60 ml');
    expect(body.priceCents).toBe(4590);
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
    expect(new Date(body.updatedAt).toISOString()).toBe(body.updatedAt);
  });

  it('persiste o preço em centavos no banco', async () => {
    await createProduct(tenantA, {
      name: 'Produto Centavos',
      description: 'Produto para validar persistência',
      priceCents: 1999,
    }).expect(201);

    const row = (await db('products').where({ name: 'Produto Centavos' }).first()) as
      { price_cents: number | string } | undefined;

    expect(Number(row?.price_cents)).toBe(1999);
  });

  it('aceita preço zero', async () => {
    const response = await createProduct(tenantA, {
      name: 'Produto Gratuito',
      description: 'Produto sem custo',
      priceCents: 0,
    }).expect(201);

    expect(response.body.priceCents).toBe(0);
  });

  it('aceita descrição ausente e permite limpar a descrição', async () => {
    const withoutDescription = await createProduct(tenantA, {
      name: 'Produto sem descrição',
      priceCents: 1000,
    }).expect(201);

    expect(withoutDescription.body.description).toBe('');

    const withDescription = await createProduct(tenantA, {
      name: 'Produto com descrição removível',
      description: 'Descrição',
      priceCents: 1500,
    }).expect(201);

    const cleared = await updateProduct(tenantA, withDescription.body.id, {
      description: '',
    }).expect(200);

    expect(cleared.body.description).toBe('');
  });

  it('rejeita campos obrigatórios ausentes', async () => {
    const empty = await createProduct(tenantA, {}).expect(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');

    const missingPrice = await createProduct(tenantA, {
      name: 'Sem Preço',
      description: 'Descrição',
    }).expect(400);
    expect(missingPrice.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita preços inválidos e o formato antigo em reais', async () => {
    const negative = await createProduct(tenantA, {
      name: 'Preço Negativo',
      description: 'Descrição',
      priceCents: -1,
    }).expect(400);
    expect(negative.body.error.code).toBe('VALIDATION_ERROR');

    const fractionalCents = await createProduct(tenantA, {
      name: 'Preço Fracionado',
      description: 'Descrição',
      priceCents: 1999.9,
    }).expect(400);
    expect(fractionalCents.body.error.code).toBe('VALIDATION_ERROR');

    const asString = await createProduct(tenantA, {
      name: 'Preço String',
      description: 'Descrição',
      priceCents: '1999',
    }).expect(400);
    expect(asString.body.error.code).toBe('VALIDATION_ERROR');

    const tooHigh = await createProduct(tenantA, {
      name: 'Preço Alto',
      description: 'Descrição',
      priceCents: 10_000_000_000,
    }).expect(400);
    expect(tooHigh.body.error.code).toBe('VALIDATION_ERROR');

    const oldDecimalField = await createProduct(tenantA, {
      name: 'Formato Antigo',
      description: 'Descrição',
      price: 19.99,
    }).expect(400);
    expect(oldDecimalField.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lista com paginação e filtro por nome', async () => {
    await createProduct(tenantA, {
      name: 'Lista Produto Ana',
      description: 'Primeiro',
      priceCents: 1000,
    }).expect(201);
    await createProduct(tenantA, {
      name: 'Lista Produto Bruno',
      description: 'Segundo',
      priceCents: 2000,
    }).expect(201);
    await createProduct(tenantA, {
      name: 'Lista Produto Carla',
      description: 'Terceiro',
      priceCents: 3000,
    }).expect(201);

    const firstPage = await listProducts(tenantA, {
      name: 'Lista Produto',
      limit: 2,
      offset: 0,
    }).expect(200);

    expect(firstPage.body.meta).toEqual({ limit: 2, offset: 0, total: 3 });
    expect(firstPage.body.data.map((product: ProductResponse) => product.name)).toEqual([
      'Lista Produto Ana',
      'Lista Produto Bruno',
    ]);

    const secondPage = await listProducts(tenantA, {
      name: 'Lista Produto',
      limit: 2,
      offset: 2,
    }).expect(200);

    expect(secondPage.body.data.map((product: ProductResponse) => product.name)).toEqual([
      'Lista Produto Carla',
    ]);
  });

  it('busca produto por ID e isola por tenant', async () => {
    const created = await createProduct(tenantA, {
      name: 'Produto Buscável',
      description: 'Descrição',
      priceCents: 1550,
    }).expect(201);

    const found = await getProduct(tenantA, created.body.id).expect(200);
    expect(found.body).toMatchObject({
      id: created.body.id,
      name: 'Produto Buscável',
      priceCents: 1550,
    });

    const otherTenant = await getProduct(tenantB, created.body.id).expect(404);
    expect(otherTenant.body.error.code).toBe('PRODUCT_NOT_FOUND');

    const invalidId = await getProduct(tenantA, 'prd_invalid').expect(400);
    expect(invalidId.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('atualiza campos individualmente e mantém os demais', async () => {
    const created = await createProduct(tenantA, {
      name: 'Produto Editável',
      description: 'Descrição original',
      priceCents: 2500,
    }).expect(201);

    const priceUpdate = await updateProduct(tenantA, created.body.id, {
      priceCents: 3990,
    }).expect(200);

    expect(priceUpdate.body).toMatchObject({
      name: 'Produto Editável',
      description: 'Descrição original',
      priceCents: 3990,
    });

    const detailsUpdate = await updateProduct(tenantA, created.body.id, {
      name: 'Produto Editado',
      description: 'Nova descrição',
    }).expect(200);

    expect(detailsUpdate.body).toMatchObject({
      name: 'Produto Editado',
      description: 'Nova descrição',
      priceCents: 3990,
    });
  });

  it('rejeita PATCH vazio', async () => {
    const created = await createProduct(tenantA, {
      name: 'Produto Patch Vazio',
      description: 'Descrição',
      priceCents: 1000,
    }).expect(201);

    const response = await updateProduct(tenantA, created.body.id, {}).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('faz soft delete, some da listagem e mantém o registro no banco', async () => {
    const created = await createProduct(tenantA, {
      name: 'Produto Excluído',
      description: 'Descrição',
      priceCents: 1000,
    }).expect(201);

    await deleteProduct(tenantA, created.body.id).expect(204);

    await getProduct(tenantA, created.body.id).expect(404);
    await updateProduct(tenantA, created.body.id, { name: 'Não' }).expect(404);
    await deleteProduct(tenantA, created.body.id).expect(404);

    const list = await listProducts(tenantA, { name: 'Produto Excluído' }).expect(200);
    expect(list.body.meta.total).toBe(0);

    const row = (await db('products').where({ name: 'Produto Excluído' }).first()) as
      { deleted_at: string | null } | undefined;

    expect(row).toBeDefined();
    expect(row?.deleted_at).not.toBeNull();
  });

  it('isola atualização e exclusão por tenant', async () => {
    const created = await createProduct(tenantA, {
      name: 'Produto Isolado',
      description: 'Descrição',
      priceCents: 1000,
    }).expect(201);

    await updateProduct(tenantB, created.body.id, { name: 'Invasão' }).expect(404);
    await deleteProduct(tenantB, created.body.id).expect(404);
    await getProduct(tenantA, created.body.id).expect(200);
  });

  it('não lista produtos de outro tenant', async () => {
    await createProduct(tenantB, {
      name: 'Produto Exclusivo Beta',
      description: 'Descrição',
      priceCents: 1000,
    }).expect(201);

    const list = await listProducts(tenantA, { name: 'Produto Exclusivo Beta' }).expect(200);
    expect(list.body.meta.total).toBe(0);
  });

  it('exige autenticação', async () => {
    const response = await request(server).get('/v1/products').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
