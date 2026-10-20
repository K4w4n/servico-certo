import type { SchemaObject } from '@nestjs/swagger';
import { z, type ZodType } from 'zod';

export function toOpenApiSchema(schema: ZodType, io: 'input' | 'output' = 'input'): SchemaObject {
  return z.toJSONSchema(schema, {
    io,
    target: 'openapi-3.0',
  }) as SchemaObject;
}
