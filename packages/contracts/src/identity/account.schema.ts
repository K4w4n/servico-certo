import { z } from 'zod';
import { paginationMetaSchema } from '../shared/pagination.schema.js';
import { accountIdSchema } from '../shared/public-id.js';

export const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email('E-mail inválido'));

export const passwordSchema = z
  .string()
  .min(10, 'A senha deve ter ao menos 10 caracteres')
  .max(128, 'A senha deve ter no máximo 128 caracteres');

export const accountNameSchema = z.string().trim().min(1).max(120);

export const accountSchema = z.object({
  id: accountIdSchema,
  name: z.string().min(1).max(120),
  email: z.string(),
});

export const listAccountsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().min(1).max(255).optional(),
});

export const listAccountsResponseSchema = z.object({
  data: z.array(accountSchema),
  meta: paginationMetaSchema,
});

export type Account = z.infer<typeof accountSchema>;
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
export type ListAccountsResponse = z.infer<typeof listAccountsResponseSchema>;
