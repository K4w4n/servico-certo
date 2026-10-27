export const SERVICE_ORDER_RECEIPT_IMAGE = Symbol('SERVICE_ORDER_RECEIPT_IMAGE');

export interface ServiceOrderReceiptImage {
  render(pdf: Uint8Array): Promise<Uint8Array>;
}
