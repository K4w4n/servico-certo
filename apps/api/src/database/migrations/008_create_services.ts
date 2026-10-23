import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('services', (table) => {
    table.uuid('id').primary();
    table
      .uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('name', 160).notNullable();
    table.text('description').notNullable();
    table.bigInteger('price_cents').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.timestamp('updated_at', { useTz: true }).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.index(['tenant_id'], 'services_tenant_idx');
    table.check('price_cents >= 0', [], 'services_price_cents_check');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('services');
}
