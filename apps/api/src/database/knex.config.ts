import fs from 'node:fs';
import path from 'node:path';
import type { Knex } from 'knex';

const apiRoot = process.cwd();

function pathsFor(environment: string): { codeRoot: string; extension: string } {
  const isProduction = environment === 'production';

  return {
    codeRoot: isProduction ? 'dist' : 'src',
    extension: isProduction ? 'js' : 'ts',
  };
}

function ensureParentDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function migrationsConfig(environment: string): Knex.MigratorConfig {
  const { codeRoot, extension } = pathsFor(environment);

  return {
    directory: process.env.MIGRATIONS_DIR ?? path.resolve(apiRoot, codeRoot, 'database/migrations'),
    extension,
  };
}

function seedsConfig(environment: string): Knex.SeederConfig {
  const { codeRoot, extension } = pathsFor(environment);

  return {
    directory: process.env.SEEDS_DIR ?? path.resolve(apiRoot, codeRoot, 'database/seeds'),
    extension,
  };
}

function sqliteConfig(filename: string, environment: string): Knex.Config {
  if (filename !== ':memory:') {
    ensureParentDirectory(filename);
  }

  return {
    client: 'better-sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    migrations: migrationsConfig(environment),
    seeds: seedsConfig(environment),
  };
}

function postgresConfig(connection: string, environment: string): Knex.Config {
  return {
    client: 'pg',
    connection,
    migrations: migrationsConfig(environment),
    seeds: seedsConfig(environment),
  };
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is required when DATABASE_CLIENT=pg.');
  }

  return url;
}

function developmentConfig(): Knex.Config {
  const client = process.env.DATABASE_CLIENT ?? 'better-sqlite3';

  if (client === 'pg') {
    return postgresConfig(requireDatabaseUrl(), 'development');
  }

  const sqlitePath = process.env.SQLITE_PATH ?? path.resolve(apiRoot, '.data/dev.sqlite');

  return sqliteConfig(path.resolve(apiRoot, sqlitePath), 'development');
}

export function getKnexConfig(environment: string): Knex.Config {
  switch (environment) {
    case 'test':
      return sqliteConfig(':memory:', environment);
    case 'production':
      return postgresConfig(requireDatabaseUrl(), environment);
    default:
      return developmentConfig();
  }
}
