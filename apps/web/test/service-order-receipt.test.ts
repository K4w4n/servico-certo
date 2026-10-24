import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadServiceOrderReceipt } from '@/modules/service-orders/lib/service-order-receipt';

describe('downloadServiceOrderReceipt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('baixa o comprovante autenticado e usa o nome retornado pela API', async () => {
    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    const download = vi.fn().mockResolvedValue({
      blob,
      filename: 'comprovante-ordem-100001.pdf',
    });
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);

    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:comprovante'),
      revokeObjectURL: vi.fn(),
    });

    await downloadServiceOrderReceipt(download, 'ord_AaFrLZYfcVevBwi2on-gZQ');

    expect(download).toHaveBeenCalledWith('/service-orders/ord_AaFrLZYfcVevBwi2on-gZQ/receipt');
    expect(anchor.href).toBe('blob:comprovante');
    expect(anchor.download).toBe('comprovante-ordem-100001.pdf');
    expect(click).toHaveBeenCalledTimes(1);
    expect(anchor.isConnected).toBe(false);
  });

  it('usa o nome padrão quando a API não envia Content-Disposition', async () => {
    const download = vi.fn().mockResolvedValue({
      blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
      filename: null,
    });
    const anchor = document.createElement('a');

    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:comprovante'),
      revokeObjectURL: vi.fn(),
    });

    await downloadServiceOrderReceipt(download, 'ord_AaFrLZYfcVevBwi2on-gZQ');

    expect(anchor.download).toBe('comprovante-ordem.pdf');
  });
});
