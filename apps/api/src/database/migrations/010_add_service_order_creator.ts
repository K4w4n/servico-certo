import type { Knex } from 'knex';

// O rebuild de service_orders no SQLite precisa desativar `foreign_keys` para
// não apagar em cascata os itens da ordem. O SQLite ignora essa alteração
// dentro de uma transação, então esta migration roda fora da transação do
// migrator (o Knex controla a troca do pragma no rebuild).
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('service_orders', (table) => {
    table
      .uuid('created_by_account_id')
      .nullable()
      .references('id')
      .inTable('accounts')
      .onDelete('SET NULL')
      .onUpdate('CASCADE');
    table.string('created_by_name', 120).nullable();
    table.string('created_by_email', 255).nullable();
    table.index(['tenant_id', 'created_by_account_id'], 'service_orders_tenant_created_by_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('service_orders', (table) => {
    table.dropIndex(['tenant_id', 'created_by_account_id'], 'service_orders_tenant_created_by_idx');
    table.dropColumn('created_by_email');
    table.dropColumn('created_by_name');
    table.dropColumn('created_by_account_id');
  });
}
