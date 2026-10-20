import { AsyncLocalStorage } from 'node:async_hooks';
import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../../database/database.module.js';
import type { UnitOfWork } from '../application/ports/unit-of-work.js';

@Injectable()
export class KnexUnitOfWork implements UnitOfWork {
  private readonly storage = new AsyncLocalStorage<Knex.Transaction>();

  constructor(@Inject(KNEX) private readonly knex: Knex) {}

  get executor(): Knex {
    return (this.storage.getStore() ?? this.knex) as Knex;
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.storage.getStore()) {
      return work();
    }

    return this.knex.transaction((transaction) => this.storage.run(transaction, work));
  }
}
