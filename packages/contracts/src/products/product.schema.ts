import { z } from 'zod';
import { paginationMetaSchema } from '../shared/pagination.schema.js';
import { productIdSchema } from '../shared/public-id.js';

export const MAX_PRODUCT_PRICE_CENTS = 9_999_999_999;

export const productNameSchema = z.string().trim().min(1).max(160);

export const productDescriptionSchema = z.string().trim().min(1).max(2000);

export const productPriceCentsSchema = z
  .number()
  .int('Preço deve ser informado em centavos inteiros')
  .min(0, 'Preço não pode ser negativo')
  .max(MAX_PRODUCT_PRICE_CENTS, 'Preço acima do limite permitido');

export const productSchema = z.object({
  id: productIdSchema,
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(2000),
  priceCents: productPriceCentsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createProductSchema = z
  .object({
    name: productNameSchema,
    description: productDescriptionSchema,
    priceCents: productPriceCentsSchema,
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: productNameSchema.optional(),
    description: productDescriptionSchema.optional(),
    priceCents: productPriceCentsSchema.optional(),
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

export const listProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  name: z.string().trim().min(1).max(160).optional(),
});

export const listProductsResponseSchema = z.object({
  data: z.array(productSchema),
  meta: paginationMetaSchema,
});

export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ListProductsResponse = z.infer<typeof listProductsResponseSchema>;
