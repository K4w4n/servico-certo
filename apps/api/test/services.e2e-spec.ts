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

type ServiceResponse = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  createdAt: string;
  updatedAt: string;
};

const PASSWORD = 'senha-super-segura';

describe('Services (e2e)', () => {
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

    tenantA = await registerTenant('services-alpha', 'owner@services-alpha.com', 'Owner Alpha');
    tenantB = await registerTenant('services-beta', 'owner@services-beta.com', 'Owner Beta');
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

  function createService(tenant: RegisteredTenant, body: Record<string, unknown>) {
    return request(server)
      .post('/v1/services')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  function listServices(tenant: RegisteredTenant, query: Record<string, unknown> = {}) {
    return request(server)
      .get('/v1/services')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .query(query);
  }

  function getService(tenant: RegisteredTenant, serviceId: string) {
    return request(server)
      .get(`/v1/services/${serviceId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`);
  }

  function updateService(
    tenant: RegisteredTenant,
    serviceId: string,
    body: Record<string, unknown>,
  ) {
    return request(server)
      .patch(`/v1/services/${serviceId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  function deleteService(tenant: RegisteredTenant, serviceId: string) {
    return request(server)
      .delete(`/v1/services/${serviceId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`);
  }

  it('cria serviço e normaliza nome e descrição', async () => {
    const response = await createService(tenantA, {
      name: '  Troca   de Óleo  ',
      description: '  Troca de óleo e filtro para carro de passeio  ',
      priceCents: 12000,
    }).expect(201);

    const body = response.body as ServiceResponse;

    expect(body.id).toMatch(/^srv_[A-Za-z0-9_-]{22}$/);
    expect(body.name).toBe('Troca de Óleo');
    expect(body.description).toBe('Troca de óleo e filtro para carro de passeio');
    expect(body.priceCents).toBe(12000);
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
    expect(new Date(body.updatedAt).toISOString()).toBe(body.updatedAt);
  });

  it('persiste o preço em centavos no banco', async () => {
    await createService(tenantA, {
      name: 'Serviço Centavos',
      description: 'Serviço para validar persistência',
      priceCents: 1999,
    }).expect(201);

    const row = (await db('services').where({ name: 'Serviço Centavos' }).first()) as
      { price_cents: number | string } | undefined;

    expect(Number(row?.price_cents)).toBe(1999);
  });

  it('aceita preço zero', async () => {
    const response = await createService(tenantA, {
      name: 'Serviço Gratuito',
      description: 'Serviço sem custo',
      priceCents: 0,
    }).expect(201);

    expect(response.body.priceCents).toBe(0);
  });

  it('rejeita campos obrigatórios ausentes', async () => {
    const empty = await createService(tenantA, {}).expect(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');

    const missingPrice = await createService(tenantA, {
      name: 'Sem Preço',
      description: 'Descrição',
    }).expect(400);
    expect(missingPrice.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita preços inválidos e o formato antigo em reais', async () => {
    const negative = await createService(tenantA, {
      name: 'Preço Negativo',
      description: 'Descrição',
      priceCents: -1,
    }).expect(400);
    expect(negative.body.error.code).toBe('VALIDATION_ERROR');

    const fractionalCents = await createService(tenantA, {
      name: 'Preço Fracionado',
      description: 'Descrição',
      priceCents: 1999.9,
    }).expect(400);
    expect(fractionalCents.body.error.code).toBe('VALIDATION_ERROR');

    const asString = await createService(tenantA, {
      name: 'Preço String',
      description: 'Descrição',
      priceCents: '1999',
    }).expect(400);
    expect(asString.body.error.code).toBe('VALIDATION_ERROR');

    const tooHigh = await createService(tenantA, {
      name: 'Preço Alto',
      description: 'Descrição',
      priceCents: 10_000_000_000,
    }).expect(400);
    expect(tooHigh.body.error.code).toBe('VALIDATION_ERROR');

    const oldDecimalField = await createService(tenantA, {
      name: 'Formato Antigo',
      description: 'Descrição',
      price: 19.99,
    }).expect(400);
    expect(oldDecimalField.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lista com paginação e filtro por nome', async () => {
    await createService(tenantA, {
      name: 'Lista Serviço Ana',
      description: 'Primeiro',
      priceCents: 10000,
    }).expect(201);
    await createService(tenantA, {
      name: 'Lista Serviço Bruno',
      description: 'Segundo',
      priceCents: 20000,
    }).expect(201);
    await createService(tenantA, {
      name: 'Lista Serviço Carla',
      description: 'Terceiro',
      priceCents: 30000,
    }).expect(201);

    const firstPage = await listServices(tenantA, {
      name: 'Lista Serviço',
      limit: 2,
      offset: 0,
    }).expect(200);

    expect(firstPage.body.meta).toEqual({ limit: 2, offset: 0, total: 3 });
    expect(firstPage.body.data.map((service: ServiceResponse) => service.name)).toEqual([
      'Lista Serviço Ana',
      'Lista Serviço Bruno',
    ]);

    const secondPage = await listServices(tenantA, {
      name: 'Lista Serviço',
      limit: 2,
      offset: 2,
    }).expect(200);

    expect(secondPage.body.data.map((service: ServiceResponse) => service.name)).toEqual([
      'Lista Serviço Carla',
    ]);
  });

  it('busca serviço por ID e isola por tenant', async () => {
    const created = await createService(tenantA, {
      name: 'Serviço Buscável',
      description: 'Descrição',
      priceCents: 1550,
    }).expect(201);

    const found = await getService(tenantA, created.body.id).expect(200);
    expect(found.body).toMatchObject({
      id: created.body.id,
      name: 'Serviço Buscável',
      priceCents: 1550,
    });

    const otherTenant = await getService(tenantB, created.body.id).expect(404);
    expect(otherTenant.body.error.code).toBe('SERVICE_NOT_FOUND');

    const invalidId = await getService(tenantA, 'srv_invalid').expect(400);
    expect(invalidId.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('atualiza campos individualmente e mantém os demais', async () => {
    const created = await createService(tenantA, {
      name: 'Serviço Editável',
      description: 'Descrição original',
      priceCents: 2500,
    }).expect(201);

    const priceUpdate = await updateService(tenantA, created.body.id, {
      priceCents: 3990,
    }).expect(200);

    expect(priceUpdate.body).toMatchObject({
      name: 'Serviço Editável',
      description: 'Descrição original',
      priceCents: 3990,
    });

    const detailsUpdate = await updateService(tenantA, created.body.id, {
      name: 'Serviço Editado',
      description: 'Nova descrição',
    }).expect(200);

    expect(detailsUpdate.body).toMatchObject({
      name: 'Serviço Editado',
      description: 'Nova descrição',
      priceCents: 3990,
    });
  });

  it('rejeita PATCH vazio', async () => {
    const created = await createService(tenantA, {
      name: 'Serviço Patch Vazio',
      description: 'Descrição',
      priceCents: 1000,
    }).expect(201);

    const response = await updateService(tenantA, created.body.id, {}).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('faz soft delete, some da listagem e mantém o registro no banco', async () => {
    const created = await createService(tenantA, {
      name: 'Serviço Excluído',
      description: 'Descrição',
      priceCents: 1000,
    }).expect(201);

    await deleteService(tenantA, created.body.id).expect(204);

    await getService(tenantA, created.body.id).expect(404);
    await updateService(tenantA, created.body.id, { name: 'Não' }).expect(404);
    await deleteService(tenantA, created.body.id).expect(404);

    const list = await listServices(tenantA, { name: 'Serviço Excluído' }).expect(200);
    expect(list.body.meta.total).toBe(0);

    const row = (await db('services').where({ name: 'Serviço Excluído' }).first()) as
      { deleted_at: string | null } | undefined;

    expect(row).toBeDefined();
    expect(row?.deleted_at).not.toBeNull();
  });

  it('isola atualização e exclusão por tenant', async () => {
    const created = await createService(tenantA, {
      name: 'Serviço Isolado',
      description: 'Descrição',
      priceCents: 1000,
    }).expect(201);

    await updateService(tenantB, created.body.id, { name: 'Invasão' }).expect(404);
    await deleteService(tenantB, created.body.id).expect(404);
    await getService(tenantA, created.body.id).expect(200);
  });

  it('não lista serviços de outro tenant', async () => {
    await createService(tenantB, {
      name: 'Serviço Exclusivo Beta',
      description: 'Descrição',
      priceCents: 1000,
    }).expect(201);

    const list = await listServices(tenantA, { name: 'Serviço Exclusivo Beta' }).expect(200);
    expect(list.body.meta.total).toBe(0);
  });

  it('exige autenticação', async () => {
    const response = await request(server).get('/v1/services').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
