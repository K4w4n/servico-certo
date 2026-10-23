import { z } from 'zod';
import { customerSchema } from '../customers/customer.schema.js';
import { productPriceCentsSchema } from '../products/product.schema.js';
import { servicePriceCentsSchema } from '../services/service.schema.js';
import { paginationMetaSchema } from '../shared/pagination.schema.js';
import {
  customerIdSchema,
  productIdSchema,
  serviceIdSchema,
  serviceOrderIdSchema,
} from '../shared/public-id.js';

export const MAX_SERVICE_ORDER_ITEMS = 100;
export const MAX_SERVICE_ORDER_QUANTITY = 9999;
export const MAX_SERVICE_ORDER_NOTE_LENGTH = 2000;

export const serviceOrderProtocolSchema = z
  .string()
  .regex(/^\d{6,9}$/, 'Protocolo deve conter de 6 a 9 dígitos');

export const serviceOrderNoteSchema = z
  .string()
  .trim()
  .max(MAX_SERVICE_ORDER_NOTE_LENGTH, 'Observação muito longa')
  .nullable()
  .transform((value) => (value === null || value.length === 0 ? null : value));

export const serviceOrderQuantitySchema = z
  .number()
  .int('Quantidade deve ser um número inteiro')
  .min(1, 'Quantidade deve ser maior que zero')
  .max(MAX_SERVICE_ORDER_QUANTITY, 'Quantidade acima do limite permitido');

export const serviceOrderProductItemSchema = z.object({
  productId: productIdSchema,
  name: z.string().min(1).max(160),
  unitPriceCents: productPriceCentsSchema,
  quantity: serviceOrderQuantitySchema,
  totalCents: z.number().int().min(0),
});

export const serviceOrderServiceItemSchema = z.object({
  serviceId: serviceIdSchema,
  name: z.string().min(1).max(160),
  priceCents: servicePriceCentsSchema,
});

export const serviceOrderSchema = z.object({
  id: serviceOrderIdSchema,
  protocol: serviceOrderProtocolSchema,
  note: z.string().nullable(),
  customer: customerSchema,
  products: z.array(serviceOrderProductItemSchema),
  services: z.array(serviceOrderServiceItemSchema),
  totalCents: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const productItemInputSchema = z
  .object({
    productId: productIdSchema,
    unitPriceCents: productPriceCentsSchema,
    quantity: serviceOrderQuantitySchema,
  })
  .strict();

const serviceItemInputSchema = z
  .object({
    serviceId: serviceIdSchema,
    priceCents: servicePriceCentsSchema,
  })
  .strict();

function duplicateId(values: string[]): string | undefined {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }

    seen.add(value);
  }

  return undefined;
}

function validateItemDuplicates(
  data: { products?: { productId: string }[]; services?: { serviceId: string }[] },
  context: z.RefinementCtx,
): void {
  if (data.products) {
    const duplicateProduct = duplicateId(data.products.map((item) => item.productId));

    if (duplicateProduct) {
      context.addIssue({
        code: 'custom',
        path: ['products'],
        message: 'Produto duplicado na ordem de serviço',
      });
    }
  }

  if (data.services) {
    const duplicateService = duplicateId(data.services.map((item) => item.serviceId));

    if (duplicateService) {
      context.addIssue({
        code: 'custom',
        path: ['services'],
        message: 'Serviço duplicado na ordem de serviço',
      });
    }
  }
}

export const createServiceOrderSchema = z
  .object({
    customerId: customerIdSchema,
    note: serviceOrderNoteSchema.optional(),
    products: z.array(productItemInputSchema).max(MAX_SERVICE_ORDER_ITEMS).optional(),
    services: z.array(serviceItemInputSchema).max(MAX_SERVICE_ORDER_ITEMS).optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const hasProducts = (data.products?.length ?? 0) > 0;
    const hasServices = (data.services?.length ?? 0) > 0;

    if (!hasProducts && !hasServices) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'Informe pelo menos um produto ou serviço',
      });
    }

    validateItemDuplicates(data, context);
  });

export const updateServiceOrderSchema = z
  .object({
    customerId: customerIdSchema.optional(),
    note: serviceOrderNoteSchema.optional(),
    products: z.array(productItemInputSchema).max(MAX_SERVICE_ORDER_ITEMS).optional(),
    services: z.array(serviceItemInputSchema).max(MAX_SERVICE_ORDER_ITEMS).optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const hasAnyField =
      data.customerId !== undefined ||
      data.note !== undefined ||
      data.products !== undefined ||
      data.services !== undefined;

    if (!hasAnyField) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'Informe ao menos um campo para atualizar',
      });
    }

    validateItemDuplicates(data, context);
  });

export const listServiceOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  protocol: z
    .string()
    .trim()
    .regex(/^\d{1,9}$/, 'Protocolo deve conter apenas dígitos')
    .optional(),
  customerId: customerIdSchema.optional(),
  productId: productIdSchema.optional(),
  serviceId: serviceIdSchema.optional(),
});

export const listServiceOrdersResponseSchema = z.object({
  data: z.array(serviceOrderSchema),
  meta: paginationMetaSchema,
});

export type ServiceOrder = z.infer<typeof serviceOrderSchema>;
export type ServiceOrderProductItem = z.infer<typeof serviceOrderProductItemSchema>;
export type ServiceOrderServiceItem = z.infer<typeof serviceOrderServiceItemSchema>;
export type CreateServiceOrderInput = z.infer<typeof createServiceOrderSchema>;
export type UpdateServiceOrderInput = z.infer<typeof updateServiceOrderSchema>;
export type ListServiceOrdersQuery = z.infer<typeof listServiceOrdersQuerySchema>;
export type ListServiceOrdersResponse = z.infer<typeof listServiceOrdersResponseSchema>;
