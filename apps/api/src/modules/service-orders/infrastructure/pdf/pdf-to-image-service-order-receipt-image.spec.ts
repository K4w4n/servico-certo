import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { PdfToImageServiceOrderReceiptImage } from './pdf-to-image-service-order-receipt-image.js';

const PNG_SIGNATURE = '89504e470d0a1a0a';

async function createPdf(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);

  for (let index = 0; index < pageCount; index += 1) {
    const page = document.addPage([595.28, 841.89]);

    page.drawText(`Comprovante ${index + 1}`, {
      x: 48,
      y: 780,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return document.save();
}

describe('PdfToImageServiceOrderReceiptImage', () => {
  it('rasteriza uma página do comprovante em PNG', async () => {
    const generator = new PdfToImageServiceOrderReceiptImage();

    const image = await generator.render(await createPdf(1));

    expect(Buffer.from(image.subarray(0, 8)).toString('hex')).toBe(PNG_SIGNATURE);
  });

  it('empilha múltiplas páginas em uma única imagem', async () => {
    const generator = new PdfToImageServiceOrderReceiptImage();

    const single = await generator.render(await createPdf(1));
    const multiple = await generator.render(await createPdf(3));

    expect(Buffer.from(multiple.subarray(0, 8)).toString('hex')).toBe(PNG_SIGNATURE);
    expect(multiple.length).toBeGreaterThan(single.length);
  });
});
