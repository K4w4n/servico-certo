import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Knex } from 'knex';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { KNEX } from '../src/database/database.module.js';
import type {
  Mailer,
  PasswordResetEmail,
} from '../src/modules/identity/application/ports/mailer.js';
import { MAILER } from '../src/modules/identity/application/ports/mailer.js';
import { runMigrations } from './helpers/migrate.js';

class FakeMailer implements Mailer {
  readonly sent: PasswordResetEmail[] = [];

  async sendPasswordReset(email: PasswordResetEmail): Promise<void> {
    this.sent.push(email);
  }
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

describe('Password reset (e2e)', () => {
  const fakeMailer = new FakeMailer();
  const tenantDomain = 'reset-oficina';
  const email = 'reset@example.com';
  const password = 'senha-super-segura';
  const newPassword = 'nova-senha-super-segura';

  let app: INestApplication;
  let db: Knex;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MAILER)
      .useValue(fakeMailer)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    db = app.get(KNEX);
    await runMigrations(db);

    const register = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        tenant: {
          name: 'Reset Oficina',
          domain: tenantDomain,
        },
        account: {
          name: 'Reset User',
          email,
          password,
        },
      })
      .expect(201);

    refreshToken = getRefreshToken(
      register.headers['set-cookie'] as unknown as string[] | undefined,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('não envia e-mail para conta inexistente', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/password-reset/request')
      .send({
        tenantDomain,
        email: 'nao-existe@example.com',
      })
      .expect(204);

    expect(fakeMailer.sent).toHaveLength(0);
  });

  it('solicita, valida sem consumir e confirma o reset', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/password-reset/request')
      .send({ tenantDomain, email })
      .expect(204);

    expect(fakeMailer.sent).toHaveLength(1);

    const sentEmail = fakeMailer.sent[0];

    if (!sentEmail) {
      throw new Error('E-mail de reset não enviado');
    }

    const token = sentEmail.token;

    const firstValidation = await request(app.getHttpServer())
      .post('/v1/auth/password-reset/validate')
      .send({ token })
      .expect(200);

    expect(firstValidation.body.account.id).toMatch(/^acc_[A-Za-z0-9_-]{22}$/);
    expect(firstValidation.body.tenant.id).toMatch(/^ten_[A-Za-z0-9_-]{22}$/);
    expect(firstValidation.body.account.email).toBe(email);
    expect(firstValidation.body.tenant.domain).toBe(tenantDomain);
    expect(firstValidation.body.expiresAt).toBeTypeOf('string');

    await request(app.getHttpServer())
      .post('/v1/auth/password-reset/validate')
      .send({ token })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/password-reset/confirm')
      .send({ token, password: newPassword })
      .expect(204);

    await request(app.getHttpServer())
      .post('/v1/auth/password-reset/validate')
      .send({ token })
      .expect(400);

    await request(app.getHttpServer())
      .post('/v1/auth/password-reset/confirm')
      .send({ token, password: newPassword })
      .expect(400);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ tenantDomain, email, password: newPassword })
      .expect(200);

    const oldPasswordLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ tenantDomain, email, password })
      .expect(401);

    expect(oldPasswordLogin.body.error.code).toBe('INVALID_CREDENTIALS');

    const oldRefresh = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', `refresh_token=${refreshToken}`)
      .expect(401);

    expect(oldRefresh.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});
