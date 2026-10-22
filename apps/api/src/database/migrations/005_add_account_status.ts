import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('accounts', (table) => {
    table.string('status', 20).notNullable().defaultTo('ACTIVE');
    table.index(['tenant_id', 'status'], 'accounts_tenant_status_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('accounts', (table) => {
    table.dropIndex(['tenant_id', 'status'], 'accounts_tenant_status_idx');
  });

  await knex.schema.alterTable('accounts', (table) => {
    table.dropColumn('status');
  });
}
