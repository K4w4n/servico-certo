import { z } from 'zod';
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

export type Account = z.infer<typeof accountSchema>;
