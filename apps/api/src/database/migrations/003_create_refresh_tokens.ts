import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary();
    table
      .uuid('account_id')
      .notNullable()
      .references('id')
      .inTable('accounts')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.uuid('family_id').notNullable();
    table.string('token_hash', 64).notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.uuid('replaced_by_id').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.unique(['token_hash'], { indexName: 'refresh_tokens_token_hash_unique' });
    table.index(['account_id', 'family_id'], 'refresh_tokens_account_family_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
}
