import { z } from 'zod';
import { accountSchema, emailSchema, passwordSchema } from './account.schema.js';
import { tenantDomainSchema, tenantSchema } from './tenant.schema.js';

export const resetTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Token de reset inválido');

export const requestPasswordResetSchema = z.object({
  tenantDomain: tenantDomainSchema,
  email: emailSchema,
});

export const validatePasswordResetTokenSchema = z.object({
  token: resetTokenSchema,
});

export const resetPasswordSchema = z.object({
  token: resetTokenSchema,
  password: passwordSchema,
});

export const passwordResetContextSchema = z.object({
  account: accountSchema,
  tenant: tenantSchema,
  expiresAt: z.iso.datetime(),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ValidatePasswordResetTokenInput = z.infer<typeof validatePasswordResetTokenSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type PasswordResetContext = z.infer<typeof passwordResetContextSchema>;
