import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import type { ServiceOrderReceiptPdfData } from '../../application/ports/service-order-receipt-pdf.js';
import { PdfLibServiceOrderReceiptPdf } from './pdf-lib-service-order-receipt-pdf.js';

const now = new Date('2026-10-24T12:00:00.000Z');

function createData(
  overrides: Partial<ServiceOrderReceiptPdfData> = {},
): ServiceOrderReceiptPdfData {
  return {
    order: {
      id: 'order-1',
      protocol: '100001',
      note: 'Observação com emoji 😀 e “aspas”',
      customer: {
        id: 'customer-1',
        name: 'Ana Souza 😀',
        address: 'Rua das Flores, 10',
        document: '52998224725',
        documentType: 'CPF',
        phoneNumber: '11999998888',
      },
      createdBy: {
        id: 'account-1',
        name: 'João',
        email: 'joao@exemplo.com',
      },
      products: Array.from({ length: 80 }, (_, index) => ({
        productId: `product-${index}`,
        name: `Produto ${index + 1}`,
        unitPriceCents: 1000 + index,
        quantity: 1,
        totalCents: 1000 + index,
      })),
      services: [
        {
          serviceId: 'service-1',
          name: 'Troca de óleo',
          priceCents: 12000,
        },
      ],
      totalCents: 12000,
      createdAt: now,
      updatedAt: now,
    },
    tenant: {
      name: 'Oficina do João',
      domain: 'oficina-do-joao',
    },
    generatedAt: now,
    generatedBy: {
      name: 'Maria',
      email: 'maria@exemplo.com',
    },
    ...overrides,
  };
}

describe('PdfLibServiceOrderReceiptPdf', () => {
  it('gera PDF válido, pagina muitos itens e sanitiza caracteres não suportados', async () => {
    const generator = new PdfLibServiceOrderReceiptPdf();

    const buffer = await generator.generate(createData());

    expect(Buffer.from(buffer.subarray(0, 5)).toString()).toBe('%PDF-');

    const document = await PDFDocument.load(buffer);

    expect(document.getTitle()).toContain('#100001');
    expect(document.getAuthor()).toBe('Oficina do João');
    expect(document.getSubject()).toContain('Ana Souza ?');
    expect(document.getPageCount()).toBeGreaterThan(1);
  });
});
