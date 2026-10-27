import type { ServiceOrderReceiptFormat } from '@servico-certo/contracts';
import type { ApiClient } from '@/shared/lib/api-client';

export async function downloadServiceOrderReceipt(
  download: ApiClient['download'],
  serviceOrderId: string,
  format: ServiceOrderReceiptFormat = 'pdf',
): Promise<void> {
  const file = await download(
    `/service-orders/${encodeURIComponent(serviceOrderId)}/receipt?format=${format}`,
  );
  const fallbackFilename = format === 'image' ? 'comprovante-ordem.png' : 'comprovante-ordem.pdf';
  const objectUrl = URL.createObjectURL(file.blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = file.filename ?? fallbackFilename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
