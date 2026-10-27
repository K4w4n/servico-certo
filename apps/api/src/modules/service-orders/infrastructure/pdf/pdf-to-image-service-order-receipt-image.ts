import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { pdf } from 'pdf-to-img';
import type { ServiceOrderReceiptImage } from '../../application/ports/service-order-receipt-image.js';

const RENDER_SCALE = 2;

@Injectable()
export class PdfToImageServiceOrderReceiptImage implements ServiceOrderReceiptImage {
  async render(pdfBytes: Uint8Array): Promise<Uint8Array> {
    const pages = await pdf(Buffer.from(pdfBytes), { scale: RENDER_SCALE });
    const pageImages: Buffer[] = [];

    for await (const page of pages) {
      pageImages.push(page);
    }

    if (pageImages.length === 0) {
      throw new Error('O PDF do comprovante não gerou nenhuma página.');
    }

    const page = pageImages[0];

    if (pageImages.length === 1 && page) {
      return page;
    }

    // Comprovantes longos podem ocupar mais de uma página. Empilhamos as
    // páginas em uma única imagem para facilitar o compartilhamento.
    const decoded = await Promise.all(pageImages.map((buffer) => loadImage(buffer)));
    const width = Math.max(...decoded.map((image) => image.width));
    const height = decoded.reduce((total, image) => total + image.height, 0);
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    let offsetY = 0;

    for (const image of decoded) {
      context.drawImage(image, 0, offsetY);
      offsetY += image.height;
    }

    return canvas.toBuffer('image/png');
  }
}
