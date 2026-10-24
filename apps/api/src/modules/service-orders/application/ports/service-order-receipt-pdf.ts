import type { ServiceOrderView } from '../queries/service-order.queries.js';

export const SERVICE_ORDER_RECEIPT_PDF = Symbol('SERVICE_ORDER_RECEIPT_PDF');

export type ServiceOrderReceiptPdfData = {
  order: ServiceOrderView;
  tenant: {
    name: string;
    domain: string;
  };
  generatedAt: Date;
  generatedBy: {
    name: string;
    email: string;
  };
};

export interface ServiceOrderReceiptPdf {
  generate(data: ServiceOrderReceiptPdfData): Promise<Uint8Array>;
}
