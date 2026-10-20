import { Injectable } from '@nestjs/common';
import { v7 } from 'uuid';
import type { IdGenerator } from '../application/ports/id-generator.js';

@Injectable()
export class UuidV7Generator implements IdGenerator {
  next(): string {
    return v7();
  }
}
