import { Global, Module } from '@nestjs/common';
import { CLOCK } from './application/ports/clock.js';
import { ID_GENERATOR } from './application/ports/id-generator.js';
import { UNIT_OF_WORK } from './application/ports/unit-of-work.js';
import { KnexUnitOfWork } from './infrastructure/knex-unit-of-work.js';
import { SystemClock } from './infrastructure/system-clock.js';
import { UuidV7Generator } from './infrastructure/uuid-v7-generator.js';

@Global()
@Module({
  providers: [
    SystemClock,
    { provide: CLOCK, useExisting: SystemClock },
    UuidV7Generator,
    { provide: ID_GENERATOR, useExisting: UuidV7Generator },
    KnexUnitOfWork,
    { provide: UNIT_OF_WORK, useExisting: KnexUnitOfWork },
  ],
  exports: [CLOCK, ID_GENERATOR, UNIT_OF_WORK, KnexUnitOfWork],
})
export class SharedModule {}
