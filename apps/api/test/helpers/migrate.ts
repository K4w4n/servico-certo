import type { Knex } from 'knex';
import * as createTenants from '../../src/database/migrations/001_create_tenants.js';
import * as createAccounts from '../../src/database/migrations/002_create_accounts.js';
import * as createRefreshTokens from '../../src/database/migrations/003_create_refresh_tokens.js';
import * as createPasswordResetTokens from '../../src/database/migrations/004_create_password_reset_tokens.js';
import * as addAccountStatus from '../../src/database/migrations/005_add_account_status.js';
import * as createCustomers from '../../src/database/migrations/006_create_customers.js';
import * as createProducts from '../../src/database/migrations/007_create_products.js';
import * as createServices from '../../src/database/migrations/008_create_services.js';

// Executa as migrations diretamente para não depender do loader de TS do Knex no Vitest.
export async function runMigrations(db: Knex): Promise<void> {
  await createTenants.up(db);
  await createAccounts.up(db);
  await createRefreshTokens.up(db);
  await createPasswordResetTokens.up(db);
  await addAccountStatus.up(db);
  await createCustomers.up(db);
  await createProducts.up(db);
  await createServices.up(db);
}
