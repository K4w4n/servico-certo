import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type {
  ServiceOrderReceiptPdf,
  ServiceOrderReceiptPdfData,
} from '../../application/ports/service-order-receipt-pdf.js';
import type { ServiceOrderView } from '../../application/queries/service-order.queries.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const BOTTOM_MARGIN = 64;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LABEL_WIDTH = 108;

const COLORS = {
  text: rgb(0.12, 0.14, 0.17),
  muted: rgb(0.42, 0.45, 0.5),
  line: rgb(0.85, 0.86, 0.88),
  soft: rgb(0.96, 0.97, 0.98),
  header: rgb(0.11, 0.16, 0.22),
  white: rgb(1, 1, 1),
} as const;

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

@Injectable()
export class PdfLibServiceOrderReceiptPdf implements ServiceOrderReceiptPdf {
  async generate(data: ServiceOrderReceiptPdfData): Promise<Uint8Array> {
    const receipt = sanitizeReceiptData(data);
    const document = await PDFDocument.create();

    document.setTitle(`Comprovante da ordem de serviço #${receipt.order.protocol}`);
    document.setSubject(
      `Ordem de serviço #${receipt.order.protocol} - ${receipt.order.customer.name}`,
    );
    document.setAuthor(receipt.tenant.name);
    document.setCreator('Serviço Certo');
    document.setProducer('Serviço Certo');
    document.setCreationDate(receipt.generatedAt);
    document.setModificationDate(receipt.generatedAt);

    const fonts = {
      regular: await document.embedFont(StandardFonts.Helvetica),
      bold: await document.embedFont(StandardFonts.HelveticaBold),
    };
    const writer = new ReceiptWriter(document, fonts, receipt);

    writer.drawHeader();
    writer.drawSection('Dados do tenant');
    writer.drawRows([
      ['Nome', receipt.tenant.name],
      ['Domínio', receipt.tenant.domain],
    ]);

    writer.drawSection('Ordem de serviço');
    writer.drawRows([
      ['Protocolo', `#${receipt.order.protocol}`],
      ['Criada em', formatDateTime(receipt.order.createdAt)],
      ['Última atualização', formatDateTime(receipt.order.updatedAt)],
      [
        'Criada por',
        receipt.order.createdBy
          ? `${receipt.order.createdBy.name} (${receipt.order.createdBy.email})`
          : 'Não informado',
      ],
    ]);

    writer.drawSection('Cliente');
    writer.drawRows([
      ['Nome', receipt.order.customer.name],
      ...(receipt.order.customer.document && receipt.order.customer.documentType
        ? [
            [
              receipt.order.customer.documentType,
              formatDocument(receipt.order.customer.document),
            ] as [string, string],
          ]
        : []),
      ...(receipt.order.customer.phoneNumber
        ? ([['Telefone', formatPhoneNumber(receipt.order.customer.phoneNumber)]] as [
            string,
            string,
          ][])
        : []),
      ...(receipt.order.customer.address
        ? ([['Endereço', receipt.order.customer.address]] as [string, string][])
        : []),
    ]);

    writer.drawItems(receipt.order);
    writer.drawTotal(receipt.order.totalCents);

    if (receipt.order.note) {
      writer.drawSection('Observação');
      writer.drawParagraph(receipt.order.note);
    }

    writer.drawSection('Comprovante');
    writer.drawRows([
      ['Gerado em', formatDateTime(receipt.generatedAt)],
      ['Gerado por', `${receipt.generatedBy.name} (${receipt.generatedBy.email})`],
    ]);

    writer.drawFooters(receipt.order.protocol);

    return document.save();
  }
}

type ReceiptFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

class ReceiptWriter {
  private page: PDFPage;
  private y: number;

  constructor(
    private readonly document: PDFDocument,
    private readonly fonts: ReceiptFonts,
    private readonly data: ServiceOrderReceiptPdfData,
  ) {
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  drawHeader(): void {
    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 124,
      width: PAGE_WIDTH,
      height: 124,
      color: COLORS.header,
    });

    this.page.drawText(fitText(this.data.tenant.name, this.fonts.bold, 18, CONTENT_WIDTH - 100), {
      x: MARGIN,
      y: PAGE_HEIGHT - 54,
      size: 18,
      font: this.fonts.bold,
      color: COLORS.white,
    });
    this.page.drawText(
      fitText(this.data.tenant.domain, this.fonts.regular, 9, CONTENT_WIDTH - 100),
      {
        x: MARGIN,
        y: PAGE_HEIGHT - 72,
        size: 9,
        font: this.fonts.regular,
        color: rgb(0.8, 0.83, 0.86),
      },
    );
    this.page.drawText('COMPROVANTE', {
      x: PAGE_WIDTH - MARGIN - this.fonts.bold.widthOfTextAtSize('COMPROVANTE', 9),
      y: PAGE_HEIGHT - 54,
      size: 9,
      font: this.fonts.bold,
      color: rgb(0.8, 0.83, 0.86),
    });
    this.page.drawText(`Ordem de serviço #${this.data.order.protocol}`, {
      x: MARGIN,
      y: PAGE_HEIGHT - 102,
      size: 15,
      font: this.fonts.bold,
      color: COLORS.white,
    });

    this.y = PAGE_HEIGHT - 152;
  }

  drawSection(title: string): void {
    this.ensureSpace(30);
    this.page.drawText(title.toUpperCase(), {
      x: MARGIN,
      y: this.y,
      size: 8,
      font: this.fonts.bold,
      color: COLORS.muted,
    });
    this.y -= 7;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.7,
      color: COLORS.line,
    });
    this.y -= 16;
  }

  drawRows(rows: Array<[string, string]>): void {
    for (const [label, value] of rows) {
      const valueLines = wrapText(value, this.fonts.regular, 9.5, CONTENT_WIDTH - LABEL_WIDTH);
      const height = Math.max(15, valueLines.length * 12 + 3);

      this.ensureSpace(height);

      this.page.drawText(label, {
        x: MARGIN,
        y: this.y,
        size: 9,
        font: this.fonts.bold,
        color: COLORS.muted,
      });

      let valueY = this.y;

      for (const line of valueLines) {
        this.page.drawText(line, {
          x: MARGIN + LABEL_WIDTH,
          y: valueY,
          size: 9.5,
          font: this.fonts.regular,
          color: COLORS.text,
        });
        valueY -= 12;
      }

      this.y -= height;
    }

    this.y -= 10;
  }

  drawItems(order: ServiceOrderView): void {
    this.drawSection('Itens');

    const columns = {
      description: MARGIN,
      descriptionWidth: 286,
      quantity: 344,
      unitPrice: 400,
      total: PAGE_WIDTH - MARGIN,
    };

    const drawTableHeader = () => {
      this.ensureSpace(24);
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - 5,
        width: CONTENT_WIDTH,
        height: 20,
        color: COLORS.soft,
      });
      this.page.drawText('Descrição', {
        x: columns.description + 6,
        y: this.y,
        size: 8.5,
        font: this.fonts.bold,
        color: COLORS.muted,
      });
      this.page.drawText('Qtd.', {
        x: columns.quantity,
        y: this.y,
        size: 8.5,
        font: this.fonts.bold,
        color: COLORS.muted,
      });
      this.page.drawText('Unitário', {
        x: columns.unitPrice,
        y: this.y,
        size: 8.5,
        font: this.fonts.bold,
        color: COLORS.muted,
      });
      this.page.drawText('Total', {
        x: columns.total - this.fonts.bold.widthOfTextAtSize('Total', 8.5),
        y: this.y,
        size: 8.5,
        font: this.fonts.bold,
        color: COLORS.muted,
      });
      this.y -= 19;
    };

    drawTableHeader();

    const items = [
      ...order.products.map((item) => ({
        name: item.name,
        quantity: String(item.quantity),
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
      })),
      ...order.services.map((item) => ({
        name: item.name,
        quantity: '1',
        unitPriceCents: item.priceCents,
        totalCents: item.priceCents,
      })),
    ];

    for (const item of items) {
      const descriptionLines = wrapText(item.name, this.fonts.regular, 9, columns.descriptionWidth);
      const rowHeight = Math.max(24, descriptionLines.length * 11 + 10);

      if (!this.hasSpace(rowHeight)) {
        this.addPage();
        drawTableHeader();
      }

      let descriptionY = this.y;

      for (const line of descriptionLines) {
        this.page.drawText(line, {
          x: columns.description + 6,
          y: descriptionY,
          size: 9,
          font: this.fonts.regular,
          color: COLORS.text,
        });
        descriptionY -= 11;
      }

      this.page.drawText(item.quantity, {
        x: columns.quantity,
        y: this.y,
        size: 9,
        font: this.fonts.regular,
        color: COLORS.text,
      });
      const unitPrice = formatCurrency(item.unitPriceCents);
      this.page.drawText(unitPrice, {
        x: columns.unitPrice,
        y: this.y,
        size: 9,
        font: this.fonts.regular,
        color: COLORS.text,
      });
      const total = formatCurrency(item.totalCents);
      this.page.drawText(total, {
        x: columns.total - this.fonts.regular.widthOfTextAtSize(total, 9),
        y: this.y,
        size: 9,
        font: this.fonts.regular,
        color: COLORS.text,
      });

      this.y -= rowHeight - 6;
      this.page.drawLine({
        start: { x: MARGIN, y: this.y },
        end: { x: PAGE_WIDTH - MARGIN, y: this.y },
        thickness: 0.5,
        color: COLORS.line,
      });
      this.y -= 6;
    }
  }

  drawTotal(totalCents: number): void {
    this.ensureSpace(38);
    this.page.drawText('Total', {
      x: PAGE_WIDTH - MARGIN - 150,
      y: this.y,
      size: 10,
      font: this.fonts.bold,
      color: COLORS.muted,
    });
    const total = formatCurrency(totalCents);
    this.page.drawText(total, {
      x: PAGE_WIDTH - MARGIN - this.fonts.bold.widthOfTextAtSize(total, 13),
      y: this.y - 2,
      size: 13,
      font: this.fonts.bold,
      color: COLORS.text,
    });
    this.y -= 30;
  }

  drawParagraph(text: string): void {
    const lines = wrapText(text, this.fonts.regular, 9.5, CONTENT_WIDTH);
    const height = lines.length * 12 + 6;

    this.ensureSpace(height);

    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN,
        y: this.y,
        size: 9.5,
        font: this.fonts.regular,
        color: COLORS.text,
      });
      this.y -= 12;
    }

    this.y -= 12;
  }

  drawFooters(protocol: string): void {
    const pages = this.document.getPages();

    pages.forEach((page, index) => {
      page.drawLine({
        start: { x: MARGIN, y: 42 },
        end: { x: PAGE_WIDTH - MARGIN, y: 42 },
        thickness: 0.5,
        color: COLORS.line,
      });
      page.drawText('Serviço Certo', {
        x: MARGIN,
        y: 28,
        size: 7.5,
        font: this.fonts.regular,
        color: COLORS.muted,
      });
      const center = `Comprovante da ordem de serviço #${protocol}`;
      page.drawText(center, {
        x: (PAGE_WIDTH - this.fonts.regular.widthOfTextAtSize(center, 7.5)) / 2,
        y: 28,
        size: 7.5,
        font: this.fonts.regular,
        color: COLORS.muted,
      });
      const pageLabel = `${index + 1}/${pages.length}`;
      page.drawText(pageLabel, {
        x: PAGE_WIDTH - MARGIN - this.fonts.regular.widthOfTextAtSize(pageLabel, 7.5),
        y: 28,
        size: 7.5,
        font: this.fonts.regular,
        color: COLORS.muted,
      });
    });
  }

  private ensureSpace(height: number): void {
    if (!this.hasSpace(height)) {
      this.addPage();
    }
  }

  private hasSpace(height: number): boolean {
    return this.y - height >= BOTTOM_MARGIN;
  }

  private addPage(): void {
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;

    this.page.drawText(`Comprovante da ordem de serviço #${this.data.order.protocol}`, {
      x: MARGIN,
      y: this.y,
      size: 10,
      font: this.fonts.bold,
      color: COLORS.muted,
    });
    this.y -= 9;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.7,
      color: COLORS.line,
    });
    this.y -= 22;
  }
}

function sanitizeReceiptData(data: ServiceOrderReceiptPdfData): ServiceOrderReceiptPdfData {
  return {
    ...data,
    tenant: {
      name: safeText(data.tenant.name),
      domain: safeText(data.tenant.domain),
    },
    generatedBy: {
      name: safeText(data.generatedBy.name),
      email: safeText(data.generatedBy.email),
    },
    order: {
      ...data.order,
      protocol: safeText(data.order.protocol),
      note: data.order.note ? safeText(data.order.note) : null,
      customer: {
        ...data.order.customer,
        name: safeText(data.order.customer.name),
        address: data.order.customer.address ? safeText(data.order.customer.address) : null,
        document: data.order.customer.document ? safeText(data.order.customer.document) : null,
        phoneNumber: data.order.customer.phoneNumber
          ? safeText(data.order.customer.phoneNumber)
          : null,
      },
      createdBy: data.order.createdBy
        ? {
            ...data.order.createdBy,
            name: safeText(data.order.createdBy.name),
            email: safeText(data.order.createdBy.email),
          }
        : null,
      products: data.order.products.map((item) => ({
        ...item,
        name: safeText(item.name),
      })),
      services: data.order.services.map((item) => ({
        ...item,
        name: safeText(item.name),
      })),
    },
  };
}

// As fontes padrão do PDF usam WinAnsi. Convertemos pontuação tipográfica para
// ASCII e substituímos caracteres fora do conjunto suportado para evitar falhas
// na geração quando o nome ou a observação contêm emojis/outros alfabetos.
function safeText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v]/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u2022]/g, '-')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/gu, '?')
    .replace(/\u00A0/g, ' ');
}

function formatDateTime(date: Date): string {
  return `${dateTimeFormatter.format(date)} (horário de Brasília)`;
}

function formatCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  const suffix = '...';
  let value = text;

  while (value.length > 0 && font.widthOfTextAtSize(`${value}${suffix}`, size) > maxWidth) {
    value = value.slice(0, -1);
  }

  return `${value.trimEnd()}${suffix}`;
}

function formatDocument(value: string): string {
  if (value.length === 11) {
    return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  if (value.length === 14) {
    return value.replace(
      /^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    );
  }

  return value;
}

function formatPhoneNumber(value: string): string {
  if (value.length === 11) {
    return value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (value.length === 10) {
    return value.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return value;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (normalized.length === 0) {
    return [''];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      lines.push(current);
    }

    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = '';

    for (const character of word) {
      const next = `${chunk}${character}`;

      if (font.widthOfTextAtSize(next, size) > maxWidth && chunk.length > 0) {
        lines.push(chunk);
        chunk = character;
      } else {
        chunk = next;
      }
    }

    current = chunk;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}
