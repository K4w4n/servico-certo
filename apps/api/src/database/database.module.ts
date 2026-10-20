import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { type Knex } from 'knex';
import { getKnexConfig } from './knex.config.js';

export const KNEX = Symbol('KNEX');

@Global()
@Module({
  providers: [
    {
      provide: KNEX,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Knex => {
        const environment = config.get<string>('NODE_ENV') ?? 'development';

        return knex(getKnexConfig(environment));
      },
    },
  ],
  exports: [KNEX],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(KNEX) private readonly connection: Knex) {}

  async onApplicationShutdown(): Promise<void> {
    await this.connection.destroy();
  }
}
