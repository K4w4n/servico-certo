import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Knex } from 'knex';
import { KNEX } from '../database/database.module.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  @Get()
  @ApiOperation({ summary: 'Verifica a saúde da API e da conexão com o banco' })
  async check(): Promise<{ status: string; database: string; timestamp: string }> {
    await this.db.raw('select 1');

    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
