import { z } from 'zod';
import { tenantIdSchema } from '../shared/public-id.js';

export const RESERVED_TENANT_DOMAINS = [
  'www',
  'api',
  'app',
  'admin',
  'docs',
  'mail',
  'support',
  'billing',
  'status',
] as const;

const TENANT_DOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

export const tenantDomainSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(3, 'O domínio deve ter ao menos 3 caracteres')
      .max(63, 'O domínio deve ter no máximo 63 caracteres')
      .regex(TENANT_DOMAIN_REGEX, 'Use apenas letras minúsculas, números e hífens')
      .refine(
        (value) =>
          !RESERVED_TENANT_DOMAINS.includes(value as (typeof RESERVED_TENANT_DOMAINS)[number]),
        'Este domínio é reservado',
      ),
  );

export const tenantSchema = z.object({
  id: tenantIdSchema,
  name: z.string().min(1).max(120),
  domain: z.string().min(3).max(63),
});

export type Tenant = z.infer<typeof tenantSchema>;
