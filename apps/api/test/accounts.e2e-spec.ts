import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Knex } from 'knex';
import request from 'supertest';
import { v7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { KNEX } from '../src/database/database.module.js';
import { decodePublicId } from '../src/shared/ids/public-id.js';
import { runMigrations } from './helpers/migrate.js';

const PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$pKfAD9WPuCxpaf5MzTvL4A$DwFoSH72NpNG39kMxxV9tWlSyU7P5/RWcQThWVC+4iA';

type RegisteredTenant = {
  accessToken: string;
  tenantId: string;
};

describe('Accounts (e2e)', () => {
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

    tenantA = await registerTenant('accounts-alpha', 'owner@alpha.com', 'Owner Alpha');
    tenantB = await registerTenant('accounts-beta', 'owner@beta.com', 'Owner Beta');

    const now = new Date();

    await db('accounts').insert([
      {
        id: v7(),
        tenant_id: tenantA.tenantId,
        name: 'Alpha Staff',
        email: 'staff@alpha.com',
        password_hash: PASSWORD_HASH,
        created_at: now,
        updated_at: now,
      },
      {
        id: v7(),
        tenant_id: tenantA.tenantId,
        name: 'Beta User',
        email: 'beta@alpha.com',
        password_hash: PASSWORD_HASH,
        created_at: now,
        updated_at: now,
      },
      {
        id: v7(),
        tenant_id: tenantA.tenantId,
        name: 'Gamma User',
        email: 'gamma@alpha.com',
        password_hash: PASSWORD_HASH,
        created_at: now,
        updated_at: now,
      },
      {
        id: v7(),
        tenant_id: tenantB.tenantId,
        name: 'Other Account',
        email: 'other@beta.com',
        password_hash: PASSWORD_HASH,
        created_at: now,
        updated_at: now,
      },
    ]);
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
        tenant: {
          name: domain,
          domain,
        },
        account: {
          name,
          email,
          password: 'senha-super-segura',
        },
      })
      .expect(201);

    return {
      accessToken: response.body.accessToken as string,
      tenantId: decodePublicId('ten', response.body.tenant.id as string),
    };
  }

  function list(tenant: RegisteredTenant) {
    return request(server).get('/v1/accounts').set('Authorization', `Bearer ${tenant.accessToken}`);
  }

  it('lista as contas do tenant com paginação padrão', async () => {
    const response = await list(tenantA).expect(200);

    expect(response.body.meta).toEqual({
      limit: 20,
      offset: 0,
      total: 4,
    });
    expect(response.body.data).toHaveLength(4);
    expect(response.body.data.map((account: { name: string }) => account.name)).toEqual([
      'Alpha Staff',
      'Beta User',
      'Gamma User',
      'Owner Alpha',
    ]);
    expect(response.body.data[0].id).toMatch(/^acc_[A-Za-z0-9_-]{22}$/);
  });

  it('aplica limit e offset', async () => {
    const response = await list(tenantA).query({ limit: 2, offset: 1 }).expect(200);

    expect(response.body.meta).toEqual({
      limit: 2,
      offset: 1,
      total: 4,
    });
    expect(response.body.data.map((account: { name: string }) => account.name)).toEqual([
      'Beta User',
      'Gamma User',
    ]);
  });

  it('filtra por nome de forma case-insensitive', async () => {
    const response = await list(tenantA).query({ name: 'ALPHA' }).expect(200);

    expect(response.body.meta.total).toBe(2);
    expect(response.body.data.map((account: { name: string }) => account.name)).toEqual([
      'Alpha Staff',
      'Owner Alpha',
    ]);
  });

  it('filtra por e-mail de forma parcial', async () => {
    const response = await list(tenantA).query({ email: 'beta' }).expect(200);

    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0].email).toBe('beta@alpha.com');
  });

  it('combina filtros de nome e e-mail', async () => {
    const response = await list(tenantA).query({ name: 'alpha', email: 'staff' }).expect(200);

    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0].name).toBe('Alpha Staff');
  });

  it('trata % como literal na busca', async () => {
    const response = await list(tenantA).query({ name: '%' }).expect(200);

    expect(response.body.meta.total).toBe(0);
    expect(response.body.data).toEqual([]);
  });

  it('retorna lista vazia quando não há correspondência', async () => {
    const response = await list(tenantA).query({ name: 'zzz' }).expect(200);

    expect(response.body.meta.total).toBe(0);
    expect(response.body.data).toEqual([]);
  });

  it('exige autenticação', async () => {
    const response = await request(server).get('/v1/accounts').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('isola as contas por tenant', async () => {
    const response = await list(tenantB).expect(200);

    expect(response.body.meta.total).toBe(2);
    expect(response.body.data.map((account: { name: string }) => account.name)).toEqual([
      'Other Account',
      'Owner Beta',
    ]);
  });

  it('rejeita limit e offset inválidos', async () => {
    const zeroLimit = await list(tenantA).query({ limit: 0 }).expect(400);
    expect(zeroLimit.body.error.code).toBe('VALIDATION_ERROR');

    const tooLarge = await list(tenantA).query({ limit: 101 }).expect(400);
    expect(tooLarge.body.error.code).toBe('VALIDATION_ERROR');

    const negativeOffset = await list(tenantA).query({ offset: -1 }).expect(400);
    expect(negativeOffset.body.error.code).toBe('VALIDATION_ERROR');
  });
});
