import knex from 'knex';
import { getKnexConfig } from './knex.config.js';

const environment = process.env.NODE_ENV ?? 'development';
const command = process.argv[2] ?? 'migrate:latest';
const db = knex(getKnexConfig(environment));

async function run(): Promise<void> {
  switch (command) {
    case 'migrate:latest':
      await db.migrate.latest();
      break;
    case 'migrate:rollback':
      await db.migrate.rollback();
      break;
    case 'seed:run':
      await db.seed.run();
      break;
    default:
      throw new Error(`Unknown database command: ${command}`);
  }
}

run()
  .then(async () => {
    await db.destroy();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await db.destroy();
    process.exitCode = 1;
  });
