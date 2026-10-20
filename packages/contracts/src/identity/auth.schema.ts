import { z } from 'zod';
import { accountNameSchema, accountSchema, emailSchema, passwordSchema } from './account.schema.js';
import { tenantDomainSchema, tenantSchema } from './tenant.schema.js';

export const registerTenantSchema = z.object({
  tenant: z.object({
    name: z.string().trim().min(1, 'Informe o nome do negócio').max(120),
    domain: tenantDomainSchema,
  }),
  account: z.object({
    name: accountNameSchema,
    email: emailSchema,
    password: passwordSchema,
  }),
});

export const loginSchema = z.object({
  tenantDomain: tenantDomainSchema,
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha').max(128),
});

export const authResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
  account: accountSchema,
  tenant: tenantSchema,
});

export const currentAccountResponseSchema = z.object({
  account: accountSchema,
  tenant: tenantSchema,
});

export type RegisterTenantInput = z.infer<typeof registerTenantSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type CurrentAccountResponse = z.infer<typeof currentAccountResponseSchema>;
