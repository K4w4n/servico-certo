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
};

const PASSWORD = 'senha-super-segura';
const NEW_PASSWORD = 'nova-senha-super-segura';

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

describe('Update account (e2e)', () => {
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

    tenantA = await registerTenant('update-alpha', 'owner@update-alpha.com', 'Owner Alpha');
    tenantB = await registerTenant('update-beta', 'owner@update-beta.com', 'Owner Beta');
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
    password = PASSWORD,
  ): Promise<CreatedAccount> {
    const response = await request(server)
      .post('/v1/accounts')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({ name, email, password })
      .expect(201);

    return response.body as CreatedAccount;
  }

  function patchAccount(
    tenant: RegisteredTenant,
    accountId: string,
    body: Record<string, unknown>,
  ) {
    return request(server)
      .patch(`/v1/accounts/${accountId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  it('atualiza somente o nome e mantém e-mail e senha', async () => {
    const account = await createAccount(tenantA, 'Nome Original', 'nome@alpha.com');

    const response = await patchAccount(tenantA, account.id, {
      name: 'Nome Atualizado',
    }).expect(200);

    expect(response.body.name).toBe('Nome Atualizado');
    expect(response.body.email).toBe('nome@alpha.com');

    await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'nome@alpha.com',
        password: PASSWORD,
      })
      .expect(200);
  });

  it('atualiza somente o e-mail e normaliza para lowercase', async () => {
    const account = await createAccount(tenantA, 'Email User', 'email.original@alpha.com');

    const response = await patchAccount(tenantA, account.id, {
      email: 'EMAIL.NOVO@ALPHA.COM',
    }).expect(200);

    expect(response.body.email).toBe('email.novo@alpha.com');

    await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'email.original@alpha.com',
        password: PASSWORD,
      })
      .expect(401);

    await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'email.novo@alpha.com',
        password: PASSWORD,
      })
      .expect(200);
  });

  it('atualiza somente a senha e revoga os refresh tokens da conta', async () => {
    const account = await createAccount(tenantA, 'Senha User', 'senha@alpha.com');

    const login = await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'senha@alpha.com',
        password: PASSWORD,
      })
      .expect(200);

    const refreshToken = getRefreshToken(
      login.headers['set-cookie'] as unknown as string[] | undefined,
    );

    await patchAccount(tenantA, account.id, { password: NEW_PASSWORD }).expect(200);

    await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'senha@alpha.com',
        password: PASSWORD,
      })
      .expect(401);

    await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'senha@alpha.com',
        password: NEW_PASSWORD,
      })
      .expect(200);

    const oldRefresh = await request(server)
      .post('/v1/auth/refresh')
      .set('Cookie', `refresh_token=${refreshToken}`)
      .expect(401);

    expect(oldRefresh.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('atualiza nome, e-mail e senha juntos', async () => {
    const account = await createAccount(tenantA, 'Tudo User', 'tudo@alpha.com');

    const response = await patchAccount(tenantA, account.id, {
      name: 'Tudo Novo',
      email: 'tudo.novo@alpha.com',
      password: NEW_PASSWORD,
    }).expect(200);

    expect(response.body.name).toBe('Tudo Novo');
    expect(response.body.email).toBe('tudo.novo@alpha.com');

    await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'tudo@alpha.com',
        password: PASSWORD,
      })
      .expect(401);

    await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'tudo.novo@alpha.com',
        password: NEW_PASSWORD,
      })
      .expect(200);
  });

  it('rejeita body vazio', async () => {
    const account = await createAccount(tenantA, 'Vazio User', 'vazio@alpha.com');

    const response = await patchAccount(tenantA, account.id, {}).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita campos desconhecidos, inclusive senha em texto puro', async () => {
    const account = await createAccount(tenantA, 'Strict User', 'strict@alpha.com');

    const response = await patchAccount(tenantA, account.id, {
      name: 'Strict Updated',
      passwordHash: 'qualquer-coisa',
    }).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita e-mail duplicado no mesmo tenant', async () => {
    await createAccount(tenantA, 'Duplicado Um', 'duplicado@alpha.com');
    const second = await createAccount(tenantA, 'Duplicado Dois', 'duplicado2@alpha.com');

    const response = await patchAccount(tenantA, second.id, {
      email: 'DUPLICADO@ALPHA.COM',
    }).expect(409);

    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('permite o mesmo e-mail em outro tenant', async () => {
    await createAccount(tenantB, 'Shared Beta', 'shared@example.com');
    const account = await createAccount(tenantA, 'Shared Alpha', 'shared-alpha@alpha.com');

    const response = await patchAccount(tenantA, account.id, {
      email: 'shared@example.com',
    }).expect(200);

    expect(response.body.email).toBe('shared@example.com');

    await request(server)
      .post('/v1/auth/login')
      .send({
        tenantDomain: tenantA.domain,
        email: 'shared@example.com',
        password: PASSWORD,
      })
      .expect(200);
  });

  it('não edita conta de outro tenant', async () => {
    const response = await patchAccount(tenantA, tenantB.accountId, {
      name: 'Invasão',
    }).expect(404);

    expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('rejeita ID público inválido', async () => {
    const response = await request(server)
      .patch('/v1/accounts/invalid-id')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({ name: 'Inválido' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita senha fraca', async () => {
    const account = await createAccount(tenantA, 'Fraca User', 'fraca@alpha.com');

    const response = await patchAccount(tenantA, account.id, {
      password: '123',
    }).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('exige autenticação', async () => {
    const response = await request(server)
      .patch(`/v1/accounts/${tenantA.accountId}`)
      .send({ name: 'Sem Token' })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
