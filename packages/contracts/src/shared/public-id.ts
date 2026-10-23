import { z } from 'zod';

export const PUBLIC_ID_PREFIXES = {
  tenant: 'ten',
  account: 'acc',
  customer: 'cus',
  product: 'prd',
} as const;

export type PublicIdResource = keyof typeof PUBLIC_ID_PREFIXES;
export type PublicIdPrefix = (typeof PUBLIC_ID_PREFIXES)[PublicIdResource];

export function publicIdSchema(prefix: PublicIdPrefix) {
  return z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9_-]{22}$`), 'ID público inválido');
}

export const tenantIdSchema = publicIdSchema(PUBLIC_ID_PREFIXES.tenant);
export const accountIdSchema = publicIdSchema(PUBLIC_ID_PREFIXES.account);
export const customerIdSchema = publicIdSchema(PUBLIC_ID_PREFIXES.customer);
export const productIdSchema = publicIdSchema(PUBLIC_ID_PREFIXES.product);

export type TenantId = z.infer<typeof tenantIdSchema>;
export type AccountId = z.infer<typeof accountIdSchema>;
export type CustomerId = z.infer<typeof customerIdSchema>;
export type ProductId = z.infer<typeof productIdSchema>;
