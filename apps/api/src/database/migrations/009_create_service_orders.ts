import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('service_orders', (table) => {
    table.uuid('id').primary();
    table
      .uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('protocol', 12).notNullable();
    table.text('note').nullable();
    table
      .uuid('customer_id')
      .notNullable()
      .references('id')
      .inTable('customers')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.timestamp('updated_at', { useTz: true }).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.unique(['tenant_id', 'protocol'], {
      indexName: 'service_orders_tenant_protocol_unique',
    });
    table.index(['tenant_id', 'customer_id'], 'service_orders_tenant_customer_idx');
    table.index(['tenant_id', 'created_at'], 'service_orders_tenant_created_idx');
    table.check("protocol <> ''", [], 'service_orders_protocol_check');
  });

  await knex.schema.createTable('service_order_products', (table) => {
    table
      .uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .uuid('service_order_id')
      .notNullable()
      .references('id')
      .inTable('service_orders')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .uuid('product_id')
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table.string('product_name', 160).notNullable();
    table.bigInteger('unit_price_cents').notNullable();
    table.integer('quantity').notNullable();
    table.primary(['service_order_id', 'product_id']);
    table.index(['tenant_id', 'product_id'], 'service_order_products_tenant_product_idx');
    table.check('unit_price_cents >= 0', [], 'service_order_products_price_check');
    table.check('quantity >= 1', [], 'service_order_products_quantity_check');
  });

  await knex.schema.createTable('service_order_services', (table) => {
    table
      .uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .uuid('service_order_id')
      .notNullable()
      .references('id')
      .inTable('service_orders')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .uuid('service_id')
      .notNullable()
      .references('id')
      .inTable('services')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table.string('service_name', 160).notNullable();
    table.bigInteger('price_cents').notNullable();
    table.primary(['service_order_id', 'service_id']);
    table.index(['tenant_id', 'service_id'], 'service_order_services_tenant_service_idx');
    table.check('price_cents >= 0', [], 'service_order_services_price_check');
  });

  await knex.schema.createTable('service_order_counters', (table) => {
    table
      .uuid('tenant_id')
      .primary()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.bigInteger('last_value').notNullable().defaultTo(0);
    table.check('last_value >= 0', [], 'service_order_counters_value_check');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('service_order_products');
  await knex.schema.dropTableIfExists('service_order_services');
  await knex.schema.dropTableIfExists('service_orders');
  await knex.schema.dropTableIfExists('service_order_counters');
}
