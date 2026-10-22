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

describe('Create account (e2e)', () => {
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

    tenantA = await registerTenant('create-alpha', 'owner@create-alpha.com', 'Owner Alpha');
    tenantB = await registerTenant('create-beta', 'owner@create-beta.com', 'Owner Beta');
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
      domain,
    };
  }

  function createAccount(tenant: RegisteredTenant, body: Record<string, unknown>) {
    return request(server)
      .post('/v1/accounts')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  it('cria uma conta no tenant autenticado', async () => {
    const response = await createAccount(tenantA, {
      name: 'Maria Silva',
      email: 'MARIA@ALPHA.COM',
      password: 'senha-super-segura',
    }).expect(201);

    expect(response.body.id).toMatch(/^acc_[A-Za-z0-9_-]{22}$/);
    expect(response.body.name).toBe('Maria Silva');
    expect(response.body.email).toBe('maria@alpha.com');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password_hash');
  });

  it('inclui a nova conta na listagem do tenant', async () => {
    const response = await request(server)
      .get('/v1/accounts')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(200);

    expect(response.body.meta.total).toBe(2);
    expect(
      response.body.data.some((account: { email: string }) => account.email === 'maria@alpha.com'),
    ).toBe(true);
  });

  it('permite login com a conta criada', async () => {
    const response = await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'maria@alpha.com',
        password: 'senha-super-segura',
      })
      .expect(200);

    expect(response.body.tenant.domain).toBe(tenantA.domain);
    expect(response.body.account.email).toBe('maria@alpha.com');
  });

  it('não permite login da conta em outro tenant', async () => {
    const response = await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantB.domain,
        email: 'maria@alpha.com',
        password: 'senha-super-segura',
      })
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejeita e-mail duplicado no mesmo tenant, ignorando maiúsculas', async () => {
    const response = await createAccount(tenantA, {
      name: 'Outra Maria',
      email: 'MARIA@ALPHA.COM',
      password: 'senha-super-segura',
    }).expect(409);

    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('permite o mesmo e-mail em outro tenant', async () => {
    const response = await createAccount(tenantB, {
      name: 'Maria no Beta',
      email: 'maria@alpha.com',
      password: 'senha-super-segura',
    }).expect(201);

    expect(response.body.email).toBe('maria@alpha.com');
  });

  it('rejeita senha fraca', async () => {
    const response = await createAccount(tenantA, {
      name: 'Senha Fraca',
      email: 'fraca@alpha.com',
      password: '123',
    }).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita e-mail inválido', async () => {
    const response = await createAccount(tenantA, {
      name: 'Email Inválido',
      email: 'not-an-email',
      password: 'senha-super-segura',
    }).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('exige autenticação', async () => {
    const response = await request(server)
      .post('/v1/accounts')
      .send({
        name: 'Sem Token',
        email: 'sem-token@alpha.com',
        password: 'senha-super-segura',
      })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
