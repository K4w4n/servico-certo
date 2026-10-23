import { z } from 'zod';
import { paginationMetaSchema } from '../shared/pagination.schema.js';
import { serviceIdSchema } from '../shared/public-id.js';

export const MAX_SERVICE_PRICE_CENTS = 9_999_999_999;

export const serviceNameSchema = z.string().trim().min(1).max(160);

export const serviceDescriptionSchema = z.string().trim().min(1).max(2000);

export const servicePriceCentsSchema = z
  .number()
  .int('Preço deve ser informado em centavos inteiros')
  .min(0, 'Preço não pode ser negativo')
  .max(MAX_SERVICE_PRICE_CENTS, 'Preço acima do limite permitido');

export const serviceSchema = z.object({
  id: serviceIdSchema,
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(2000),
  priceCents: servicePriceCentsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createServiceSchema = z
  .object({
    name: serviceNameSchema,
    description: serviceDescriptionSchema,
    priceCents: servicePriceCentsSchema,
  })
  .strict();

export const updateServiceSchema = z
  .object({
    name: serviceNameSchema.optional(),
    description: serviceDescriptionSchema.optional(),
    priceCents: servicePriceCentsSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined || data.description !== undefined || data.priceCents !== undefined,
    {
      message: 'Informe ao menos um campo para atualizar',
      path: [],
    },
  );

export const listServicesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  name: z.string().trim().min(1).max(160).optional(),
});

export const listServicesResponseSchema = z.object({
  data: z.array(serviceSchema),
  meta: paginationMetaSchema,
});

export type Service = z.infer<typeof serviceSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type ListServicesResponse = z.infer<typeof listServicesResponseSchema>;
