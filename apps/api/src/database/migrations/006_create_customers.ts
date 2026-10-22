import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary();
    table
      .uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('name', 160).notNullable();
    table.string('address', 500).nullable();
    table.string('document', 14).nullable();
    table.string('document_type', 4).nullable();
    table.string('phone_number', 20).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.timestamp('updated_at', { useTz: true }).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.index(['tenant_id'], 'customers_tenant_idx');
    table.check(
      "(document is null and document_type is null) or (document_type = 'CPF' and length(document) = 11) or (document_type = 'CNPJ' and length(document) = 14)",
      [],
      'customers_document_type_check',
    );
  });

  await knex.raw(
    'create unique index customers_tenant_document_unique on customers (tenant_id, document) where document is not null and deleted_at is null',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('customers');
}
