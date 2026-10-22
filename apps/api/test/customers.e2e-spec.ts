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

type CustomerResponse = {
  id: string;
  name: string;
  address: string | null;
  document: string | null;
  documentType: 'CPF' | 'CNPJ' | null;
  phoneNumber: string | null;
};

const PASSWORD = 'senha-super-segura';

function calculateDigit(values: number[], weights: number[]): number {
  const sum = values.reduce((total, value, index) => total + value * (weights[index] ?? 0), 0);
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

function makeCpf(seed: number): string {
  const base = String(seed).padStart(9, '0').slice(-9).split('').map(Number);
  const first = calculateDigit(base, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculateDigit([...base, first], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return `${base.join('')}${first}${second}`;
}

function makeCnpj(seed: number): string {
  const base = String(seed).padStart(12, '0').slice(-12);
  const values = base.split('').map((character) => character.charCodeAt(0) - 48);
  const first = calculateDigit(values, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculateDigit([...values, first], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return `${base}${first}${second}`;
}

function formatCpf(value: string): string {
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatCnpj(value: string): string {
  return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

describe('Customers (e2e)', () => {
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

    tenantA = await registerTenant('customers-alpha', 'owner@customers-alpha.com', 'Owner Alpha');
    tenantB = await registerTenant('customers-beta', 'owner@customers-beta.com', 'Owner Beta');
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

  function createCustomer(tenant: RegisteredTenant, body: Record<string, unknown>) {
    return request(server)
      .post('/v1/customers')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  function listCustomers(tenant: RegisteredTenant, query: Record<string, unknown> = {}) {
    return request(server)
      .get('/v1/customers')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .query(query);
  }

  function updateCustomer(
    tenant: RegisteredTenant,
    customerId: string,
    body: Record<string, unknown>,
  ) {
    return request(server)
      .patch(`/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send(body);
  }

  function deleteCustomer(tenant: RegisteredTenant, customerId: string) {
    return request(server)
      .delete(`/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`);
  }

  it('cria cliente apenas com nome', async () => {
    const response = await createCustomer(tenantA, { name: 'Cliente Mínimo' }).expect(201);

    expect(response.body.id).toMatch(/^cus_[A-Za-z0-9_-]{22}$/);
    expect(response.body).toMatchObject({
      name: 'Cliente Mínimo',
      address: null,
      document: null,
      documentType: null,
      phoneNumber: null,
    });
  });

  it('cria cliente com CPF formatado e normaliza os campos', async () => {
    const cpf = makeCpf(101);
    const response = await createCustomer(tenantA, {
      name: 'Cliente CPF',
      address: 'Rua A, 1',
      document: formatCpf(cpf),
      documentType: 'CPF',
      phoneNumber: '(11) 99999-8888',
    }).expect(201);

    expect(response.body).toMatchObject({
      name: 'Cliente CPF',
      address: 'Rua A, 1',
      document: cpf,
      documentType: 'CPF',
      phoneNumber: '11999998888',
    });
  });

  it('cria cliente com CNPJ numérico e alfanumérico', async () => {
    const cnpj = makeCnpj(202);

    const numeric = await createCustomer(tenantA, {
      name: 'Cliente CNPJ',
      document: formatCnpj(cnpj),
      documentType: 'CNPJ',
    }).expect(201);

    expect(numeric.body.document).toBe(cnpj);
    expect(numeric.body.documentType).toBe('CNPJ');

    const alphanumeric = await createCustomer(tenantA, {
      name: 'Cliente CNPJ Alfa',
      document: '12.abc.345/01de-35',
      documentType: 'CNPJ',
    }).expect(201);

    expect(alphanumeric.body.document).toBe('12ABC34501DE35');
    expect(alphanumeric.body.documentType).toBe('CNPJ');
  });

  it('rejeita documento e documentType incompletos', async () => {
    const onlyDocument = await createCustomer(tenantA, {
      name: 'Sem Tipo',
      document: makeCpf(303),
    }).expect(400);

    expect(onlyDocument.body.error.code).toBe('VALIDATION_ERROR');

    const onlyType = await createCustomer(tenantA, {
      name: 'Sem Documento',
      documentType: 'CPF',
    }).expect(400);

    expect(onlyType.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita CPF inválido e documento com tipo incompatível', async () => {
    const invalidCpf = await createCustomer(tenantA, {
      name: 'CPF Inválido',
      document: '52998224724',
      documentType: 'CPF',
    }).expect(400);

    expect(invalidCpf.body.error.code).toBe('INVALID_DOCUMENT');

    const mismatch = await createCustomer(tenantA, {
      name: 'Tipo Incompatível',
      document: '52998224725',
      documentType: 'CNPJ',
    }).expect(400);

    expect(mismatch.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lista com paginação e filtros', async () => {
    await createCustomer(tenantA, { name: 'Lista Ana' }).expect(201);
    await createCustomer(tenantA, { name: 'Lista Bruno' }).expect(201);
    await createCustomer(tenantA, { name: 'Lista Carla' }).expect(201);
    const cpf = makeCpf(404);
    await createCustomer(tenantA, {
      name: 'Lista Documento',
      document: cpf,
      documentType: 'CPF',
    }).expect(201);

    const firstPage = await listCustomers(tenantA, {
      name: 'Lista',
      limit: 2,
      offset: 0,
    }).expect(200);

    expect(firstPage.body.meta).toEqual({ limit: 2, offset: 0, total: 4 });
    expect(firstPage.body.data.map((customer: CustomerResponse) => customer.name)).toEqual([
      'Lista Ana',
      'Lista Bruno',
    ]);

    const secondPage = await listCustomers(tenantA, {
      name: 'Lista',
      limit: 2,
      offset: 2,
    }).expect(200);

    expect(secondPage.body.data.map((customer: CustomerResponse) => customer.name)).toEqual([
      'Lista Carla',
      'Lista Documento',
    ]);

    const byDocument = await listCustomers(tenantA, {
      document: cpf.slice(0, 6),
    }).expect(200);

    expect(
      byDocument.body.data.some((customer: CustomerResponse) => customer.document === cpf),
    ).toBe(true);
  });

  it('edita nome, endereço, telefone e documento, e limpa campos com null', async () => {
    const cpf = makeCpf(505);
    const created = await createCustomer(tenantA, {
      name: 'Editar Cliente',
      address: 'Rua Antiga',
      phoneNumber: '1133334444',
      document: cpf,
      documentType: 'CPF',
    }).expect(201);

    const cnpj = makeCnpj(606);
    const updated = await updateCustomer(tenantA, created.body.id, {
      name: 'Editado',
      address: 'Rua Nova',
      phoneNumber: '11988887777',
      document: formatCnpj(cnpj),
      documentType: 'CNPJ',
    }).expect(200);

    expect(updated.body).toMatchObject({
      name: 'Editado',
      address: 'Rua Nova',
      phoneNumber: '11988887777',
      document: cnpj,
      documentType: 'CNPJ',
    });

    const cleared = await updateCustomer(tenantA, created.body.id, {
      document: null,
      documentType: null,
      address: null,
      phoneNumber: null,
    }).expect(200);

    expect(cleared.body).toMatchObject({
      document: null,
      documentType: null,
      address: null,
      phoneNumber: null,
    });
  });

  it('rejeita documento duplicado no mesmo tenant', async () => {
    const cpf = makeCpf(707);

    await createCustomer(tenantA, {
      name: 'Duplicado Um',
      document: cpf,
      documentType: 'CPF',
    }).expect(201);

    const duplicate = await createCustomer(tenantA, {
      name: 'Duplicado Dois',
      document: cpf,
      documentType: 'CPF',
    }).expect(409);

    expect(duplicate.body.error.code).toBe('DOCUMENT_TAKEN');
  });

  it('permite o mesmo documento em outro tenant', async () => {
    const cpf = makeCpf(808);

    await createCustomer(tenantA, {
      name: 'Mesmo Documento A',
      document: cpf,
      documentType: 'CPF',
    }).expect(201);

    const otherTenant = await createCustomer(tenantB, {
      name: 'Mesmo Documento B',
      document: cpf,
      documentType: 'CPF',
    }).expect(201);

    expect(otherTenant.body.document).toBe(cpf);
  });

  it('faz soft delete, some da listagem e permite reutilizar o documento', async () => {
    const cpf = makeCpf(909);
    const created = await createCustomer(tenantA, {
      name: 'Excluir Cliente',
      document: cpf,
      documentType: 'CPF',
    }).expect(201);

    await deleteCustomer(tenantA, created.body.id).expect(204);

    const list = await listCustomers(tenantA, { name: 'Excluir Cliente' }).expect(200);
    expect(list.body.meta.total).toBe(0);

    await updateCustomer(tenantA, created.body.id, { name: 'Não' }).expect(404);
    await deleteCustomer(tenantA, created.body.id).expect(404);

    await createCustomer(tenantA, {
      name: 'Documento Reutilizado',
      document: cpf,
      documentType: 'CPF',
    }).expect(201);
  });

  it('isola clientes por tenant', async () => {
    const created = await createCustomer(tenantA, { name: 'Cliente Isolado' }).expect(201);

    await updateCustomer(tenantB, created.body.id, { name: 'Invasão' }).expect(404);
    await deleteCustomer(tenantB, created.body.id).expect(404);
  });

  it('rejeita body vazio no PATCH', async () => {
    const created = await createCustomer(tenantA, { name: 'Patch Vazio' }).expect(201);

    const response = await updateCustomer(tenantA, created.body.id, {}).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('exige autenticação', async () => {
    const response = await request(server).get('/v1/customers').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
