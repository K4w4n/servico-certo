import { z } from 'zod';
import { paginationMetaSchema } from '../shared/pagination.schema.js';
import { customerIdSchema } from '../shared/public-id.js';

export const customerDocumentTypeSchema = z.enum(['CPF', 'CNPJ']);

export const customerNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome do cliente')
  .max(160, 'O nome deve ter no máximo 160 caracteres');

export const customerAddressSchema = z
  .string()
  .trim()
  .max(500, 'O endereço deve ter no máximo 500 caracteres')
  .nullable();

const normalizeDocument = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

const normalizePhoneNumber = (value: string): string => value.replace(/\D/g, '');

export const customerDocumentValueSchema = z
  .string()
  .transform(normalizeDocument)
  .pipe(z.string().min(11, 'Documento inválido').max(14, 'Documento inválido'));

export const customerPhoneNumberSchema = z
  .string()
  .transform(normalizePhoneNumber)
  .pipe(z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'));

type DocumentPair = {
  document?: string | null;
  documentType?: 'CPF' | 'CNPJ' | null;
};

function validateDocumentPair(data: DocumentPair, context: z.RefinementCtx): void {
  const hasDocument = data.document !== undefined && data.document !== null;
  const hasDocumentType = data.documentType !== undefined && data.documentType !== null;

  if (hasDocument !== hasDocumentType) {
    context.addIssue({
      code: 'custom',
      path: ['documentType'],
      message: 'Informe document e documentType juntos',
    });
    return;
  }

  if (!hasDocument || !hasDocumentType) {
    return;
  }

  const document = data.document as string;

  if (data.documentType === 'CPF') {
    if (!/^\d{11}$/.test(document)) {
      context.addIssue({
        code: 'custom',
        path: ['document'],
        message: 'CPF deve conter 11 dígitos',
      });
    }

    return;
  }

  if (!/^[A-Z0-9]{12}\d{2}$/.test(document)) {
    context.addIssue({
      code: 'custom',
      path: ['document'],
      message: 'CNPJ deve conter 12 caracteres alfanuméricos e 2 dígitos verificadores',
    });
  }
}

export const customerSchema = z.object({
  id: customerIdSchema,
  name: z.string().min(1).max(160),
  address: z.string().nullable(),
  document: z.string().nullable(),
  documentType: customerDocumentTypeSchema.nullable(),
  phoneNumber: z.string().nullable(),
});

export const createCustomerSchema = z
  .object({
    name: customerNameSchema,
    address: customerAddressSchema.optional(),
    document: customerDocumentValueSchema.nullable().optional(),
    documentType: customerDocumentTypeSchema.nullable().optional(),
    phoneNumber: customerPhoneNumberSchema.nullable().optional(),
  })
  .strict()
  .superRefine(validateDocumentPair);

export const updateCustomerSchema = z
  .object({
    name: customerNameSchema.optional(),
    address: customerAddressSchema.optional(),
    document: customerDocumentValueSchema.nullable().optional(),
    documentType: customerDocumentTypeSchema.nullable().optional(),
    phoneNumber: customerPhoneNumberSchema.nullable().optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const hasAnyField =
      data.name !== undefined ||
      data.address !== undefined ||
      data.document !== undefined ||
      data.documentType !== undefined ||
      data.phoneNumber !== undefined;

    if (!hasAnyField) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'Informe ao menos um campo para atualizar',
      });
    }

    validateDocumentPair(data, context);
  });

export const listCustomersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  name: z.string().trim().min(1).max(160).optional(),
  document: z.string().transform(normalizeDocument).pipe(z.string().min(1).max(14)).optional(),
});

export const listCustomersResponseSchema = z.object({
  data: z.array(customerSchema),
  meta: paginationMetaSchema,
});

export type Customer = z.infer<typeof customerSchema>;
export type CustomerDocumentType = z.infer<typeof customerDocumentTypeSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type ListCustomersResponse = z.infer<typeof listCustomersResponseSchema>;
