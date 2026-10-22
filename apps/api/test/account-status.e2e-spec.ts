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
  accountId: string;
};

type CreatedAccount = {
  id: string;
  name: string;
  email: string;
  status: string;
};

const PASSWORD = 'senha-super-segura';

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

describe('Account status (e2e)', () => {
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

    tenantA = await registerTenant('status-alpha', 'owner@status-alpha.com', 'Owner Alpha');
    tenantB = await registerTenant('status-beta', 'owner@status-beta.com', 'Owner Beta');
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
          password: PASSWORD,
        },
      })
      .expect(201);

    return {
      accessToken: response.body.accessToken as string,
      domain,
      accountId: response.body.account.id as string,
    };
  }

  async function createAccount(
    tenant: RegisteredTenant,
    name: string,
    email: string,
  ): Promise<CreatedAccount> {
    const response = await request(server)
      .post('/v1/accounts')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({ name, email, password: PASSWORD })
      .expect(201);

    return response.body as CreatedAccount;
  }

  function patchStatus(tenant: RegisteredTenant, accountId: string, status: string) {
    return request(server)
      .patch(`/v1/accounts/${accountId}/status`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({ status });
  }

  function login(tenant: RegisteredTenant, email: string, password = PASSWORD) {
    return request(server).post('/v1/auth/login').send({
      tenantDomain: tenant.domain,
      email,
      password,
    });
  }

  it('bloqueia, revoga sessões, lista o status e desbloqueia', async () => {
    const target = await createAccount(tenantA, 'Status User', 'status@alpha.com');

    expect(target.status).toBe('ACTIVE');

    const targetLogin = await login(tenantA, 'status@alpha.com').expect(200);
    const targetAccessToken = targetLogin.body.accessToken as string;
    const targetRefreshToken = getRefreshToken(
      targetLogin.headers['set-cookie'] as unknown as string[] | undefined,
    );

    const blocked = await patchStatus(tenantA, target.id, 'BLOCKED').expect(200);
    expect(blocked.body.status).toBe('BLOCKED');

    const blockedLogin = await login(tenantA, 'status@alpha.com').expect(401);
    expect(blockedLogin.body.error.code).toBe('INVALID_CREDENTIALS');

    const blockedAccess = await request(server)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${targetAccessToken}`)
      .expect(403);

    expect(blockedAccess.body.error.code).toBe('ACCOUNT_BLOCKED');

    const oldRefresh = await request(server)
      .post('/v1/auth/refresh')
      .set('Cookie', `refresh_token=${targetRefreshToken}`)
      .expect(401);

    expect(oldRefresh.body.error.code).toBe('INVALID_REFRESH_TOKEN');

    const list = await request(server)
      .get('/v1/accounts')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(200);

    const listedAccount = list.body.data.find(
      (account: { email: string }) => account.email === 'status@alpha.com',
    );
    expect(listedAccount.status).toBe('BLOCKED');

    const active = await patchStatus(tenantA, target.id, 'ACTIVE').expect(200);
    expect(active.body.status).toBe('ACTIVE');

    await login(tenantA, 'status@alpha.com').expect(200);
  });

  it('é idempotente ao repetir o mesmo status', async () => {
    const target = await createAccount(tenantA, 'Idem User', 'idem@alpha.com');

    const blocked = await patchStatus(tenantA, target.id, 'BLOCKED').expect(200);
    expect(blocked.body.status).toBe('BLOCKED');

    const blockedAgain = await patchStatus(tenantA, target.id, 'BLOCKED').expect(200);
    expect(blockedAgain.body.status).toBe('BLOCKED');

    const active = await patchStatus(tenantA, target.id, 'ACTIVE').expect(200);
    expect(active.body.status).toBe('ACTIVE');

    const activeAgain = await patchStatus(tenantA, target.id, 'ACTIVE').expect(200);
    expect(activeAgain.body.status).toBe('ACTIVE');
  });

  it('não permite bloquear a própria conta', async () => {
    const response = await patchStatus(tenantA, tenantA.accountId, 'BLOCKED').expect(409);

    expect(response.body.error.code).toBe('CANNOT_BLOCK_SELF');
  });

  it('não altera conta de outro tenant', async () => {
    const response = await patchStatus(tenantA, tenantB.accountId, 'BLOCKED').expect(404);

    expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('rejeita status inválido', async () => {
    const target = await createAccount(tenantA, 'Status Inválido', 'status-invalido@alpha.com');

    const response = await patchStatus(tenantA, target.id, 'DISABLED').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('exige autenticação', async () => {
    const response = await request(server)
      .patch(`/v1/accounts/${tenantA.accountId}/status`)
      .send({ status: 'BLOCKED' })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
