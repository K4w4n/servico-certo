import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.uuid('id').primary();
    table
      .uuid('account_id')
      .notNullable()
      .references('id')
      .inTable('accounts')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('token_hash', 64).notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('used_at', { useTz: true }).nullable();
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.unique(['token_hash'], {
      indexName: 'password_reset_tokens_token_hash_unique',
    });
    table.index(['account_id'], 'password_reset_tokens_account_id_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_reset_tokens');
}
