import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Knex } from 'knex';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { KNEX } from '../src/database/database.module.js';
import { runMigrations } from './helpers/migrate.js';

type RegisterPayload = {
  tenant: { name: string; domain: string };
  account: { name: string; email: string; password: string };
};

function registerPayload(suffix: string): RegisterPayload {
  return {
    tenant: {
      name: `Oficina ${suffix}`,
      domain: `oficina-${suffix}`,
    },
    account: {
      name: 'João',
      email: `joao-${suffix}@example.com`,
      password: 'senha-super-segura',
    },
  };
}

function getRefreshToken(setCookie: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = cookies.find((value) => value.startsWith('refresh_token='));

  if (!cookie) {
    throw new Error('refresh_token cookie not found');
  }

  const [pair] = cookie.split(';');

  if (!pair) {
    throw new Error('Invalid refresh_token cookie');
  }

  return pair.slice('refresh_token='.length);
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let db: Knex;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    db = app.get(KNEX);
    await runMigrations(db);

    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra tenant + conta e retorna IDs públicos', async () => {
    const response = await agent
      .post('/v1/auth/register')
      .send(registerPayload('alpha'))
      .expect(201);

    expect(response.body.account.id).toMatch(/^acc_[A-Za-z0-9_-]{22}$/);
    expect(response.body.tenant.id).toMatch(/^ten_[A-Za-z0-9_-]{22}$/);
    expect(response.body.account.email).toBe('joao-alpha@example.com');
    expect(response.body.tokenType).toBe('Bearer');
  });

  it('retorna a conta atual com o access token', async () => {
    const register = await agent
      .post('/v1/auth/register')
      .send(registerPayload('beta'))
      .expect(201);

    const me = await agent
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .expect(200);

    expect(me.body.tenant.domain).toBe('oficina-beta');
    expect(me.body.account.email).toBe('joao-beta@example.com');
  });

  it('faz login e rejeita senha inválida', async () => {
    const payload = registerPayload('gamma');

    await agent.post('/v1/auth/register').send(payload).expect(201);

    const login = await agent
      .post('/v1/auth/login')
      .send({
        tenantDomain: payload.tenant.domain,
        email: payload.account.email,
        password: payload.account.password,
      })
      .expect(200);

    expect(login.body.accessToken).toBeTypeOf('string');

    const invalid = await agent
      .post('/v1/auth/login')
      .send({
        tenantDomain: payload.tenant.domain,
        email: payload.account.email,
        password: 'senha-errada',
      })
      .expect(401);

    expect(invalid.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('permite o mesmo e-mail em tenants diferentes e isola os dados', async () => {
    const first = registerPayload('delta');
    const second = registerPayload('epsilon');
    second.account.email = first.account.email;

    const firstResponse = await agent.post('/v1/auth/register').send(first).expect(201);
    const secondResponse = await agent.post('/v1/auth/register').send(second).expect(201);

    const firstMe = await agent
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${firstResponse.body.accessToken}`)
      .expect(200);

    const secondMe = await agent
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${secondResponse.body.accessToken}`)
      .expect(200);

    expect(firstMe.body.tenant.domain).toBe('oficina-delta');
    expect(secondMe.body.tenant.domain).toBe('oficina-epsilon');
  });

  it('rotaciona o refresh token e detecta reuso', async () => {
    const register = await agent
      .post('/v1/auth/register')
      .send(registerPayload('zeta'))
      .expect(201);

    const oldRefreshToken = getRefreshToken(
      register.headers['set-cookie'] as unknown as string[] | undefined,
    );

    const refreshed = await agent.post('/v1/auth/refresh').expect(200);
    expect(refreshed.body.accessToken).not.toBe(register.body.accessToken);

    const reuse = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', `refresh_token=${oldRefreshToken}`)
      .expect(401);

    expect(reuse.body.error.code).toBe('INVALID_REFRESH_TOKEN');

    await agent.post('/v1/auth/refresh').expect(401);
  });

  it('faz logout e invalida a sessão', async () => {
    await agent.post('/v1/auth/register').send(registerPayload('eta')).expect(201);
    await agent.post('/v1/auth/logout').expect(204);
    await agent.post('/v1/auth/refresh').expect(401);
  });

  it('rejeita domínio duplicado', async () => {
    const payload = registerPayload('theta');

    await agent.post('/v1/auth/register').send(payload).expect(201);

    const duplicate = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(payload)
      .expect(409);

    expect(duplicate.body.error.code).toBe('TENANT_DOMAIN_TAKEN');
  });

  it('rejeita acesso sem access token', async () => {
    const response = await request(app.getHttpServer()).get('/v1/auth/me').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejeita payload inválido com VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        tenant: { name: 'X', domain: 'a' },
        account: { name: 'X', email: 'not-an-email', password: '123' },
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toBeDefined();
  });

  it('mantém foreign keys habilitadas no SQLite', async () => {
    const result = (await db.raw('PRAGMA foreign_keys')) as Array<{ foreign_keys: number }>;

    expect(result[0]?.foreign_keys).toBe(1);
  });
});
