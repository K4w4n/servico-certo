import type { Knex } from 'knex';
import { getKnexConfig } from './src/database/knex.config.js';

const knexfile: Record<string, Knex.Config> = {
  get development() {
    return getKnexConfig('development');
  },
  get test() {
    return getKnexConfig('test');
  },
  get production() {
    return getKnexConfig('production');
  },
};

export default knexfile;
