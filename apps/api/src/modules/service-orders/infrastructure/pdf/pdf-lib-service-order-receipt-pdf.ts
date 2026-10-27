import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
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

const TABLE_COLUMNS = {
  type: MARGIN + 6,
  description: MARGIN + 78,
  descriptionWidth: 174,
  quantityRight: MARGIN + 282,
  unitPriceRight: MARGIN + 378,
  totalRight: PAGE_WIDTH - MARGIN,
} as const;

const TABLE_ROW_PADDING = 8;
const TABLE_LINE_HEIGHT = 11;
const TABLE_TEXT_ASCENT = 6.5;
const TABLE_TEXT_DESCENT = 1.9;

const COLORS = {
  ink: rgb(0.102, 0.102, 0.102),
  text: rgb(0.18, 0.18, 0.18),
  muted: rgb(0.42, 0.42, 0.42),
  line: rgb(0.86, 0.86, 0.86),
  brand: rgb(0.961, 0.773, 0.094),
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
    const top = PAGE_HEIGHT - MARGIN;
    const right = PAGE_WIDTH - MARGIN;

    this.page.drawRectangle({
      x: MARGIN,
      y: top - 30,
      width: 5,
      height: 30,
      color: COLORS.brand,
    });

    this.page.drawText('SERVIÇO CERTO', {
      x: MARGIN + 14,
      y: top - 7,
      size: 8,
      font: this.fonts.bold,
      color: COLORS.muted,
    });

    this.page.drawText(fitText(this.data.tenant.name, this.fonts.bold, 19, 300), {
      x: MARGIN + 14,
      y: top - 29,
      size: 19,
      font: this.fonts.bold,
      color: COLORS.ink,
    });

    this.page.drawText(fitText(this.data.tenant.domain, this.fonts.regular, 9, 300), {
      x: MARGIN + 14,
      y: top - 43,
      size: 9,
      font: this.fonts.regular,
      color: COLORS.muted,
    });

    this.drawRightText('COMPROVANTE', right, top - 7, 8, this.fonts.bold, COLORS.muted);
    this.drawRightText(
      `#${this.data.order.protocol}`,
      right,
      top - 30,
      17,
      this.fonts.bold,
      COLORS.ink,
    );
    this.drawRightText(
      fitText(`Emitido em ${formatDateTime(this.data.generatedAt)}`, this.fonts.regular, 8, 210),
      right,
      top - 44,
      8,
      this.fonts.regular,
      COLORS.muted,
    );

    const ruleY = top - 58;

    this.page.drawLine({
      start: { x: MARGIN, y: ruleY },
      end: { x: right, y: ruleY },
      thickness: 2.4,
      color: COLORS.brand,
    });

    this.y = ruleY - 26;
  }

  drawSection(title: string): void {
    this.ensureSpace(30);
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - 1,
      width: 5,
      height: 5,
      color: COLORS.brand,
    });
    this.page.drawText(title.toUpperCase(), {
      x: MARGIN + 12,
      y: this.y,
      size: 8.5,
      font: this.fonts.bold,
      color: COLORS.ink,
    });
    this.y -= 8;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.6,
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

    const columns = TABLE_COLUMNS;

    const drawTableHeader = () => {
      this.ensureSpace(26);
      const headerTextY = this.y + 2.8;

      this.page.drawText('Tipo', {
        x: columns.type,
        y: headerTextY,
        size: 8.5,
        font: this.fonts.bold,
        color: COLORS.muted,
      });
      this.page.drawText('Descrição', {
        x: columns.description,
        y: headerTextY,
        size: 8.5,
        font: this.fonts.bold,
        color: COLORS.muted,
      });
      this.drawRightText(
        'Qtd.',
        columns.quantityRight,
        headerTextY,
        8.5,
        this.fonts.bold,
        COLORS.muted,
      );
      this.drawRightText(
        'Unitário',
        columns.unitPriceRight,
        headerTextY,
        8.5,
        this.fonts.bold,
        COLORS.muted,
      );
      this.drawRightText(
        'Total',
        columns.totalRight,
        headerTextY,
        8.5,
        this.fonts.bold,
        COLORS.muted,
      );
      this.y -= 9;
      this.page.drawLine({
        start: { x: MARGIN, y: this.y },
        end: { x: PAGE_WIDTH - MARGIN, y: this.y },
        thickness: 0.8,
        color: COLORS.ink,
      });
      this.y -= 15;
    };

    drawTableHeader();

    const items = [
      ...order.products.map((item) => ({
        type: 'PRODUTO',
        name: item.name,
        quantity: String(item.quantity),
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
      })),
      ...order.services.map((item) => ({
        type: 'SERVIÇO',
        name: item.name,
        quantity: '1',
        unitPriceCents: item.priceCents,
        totalCents: item.priceCents,
      })),
    ];

    items.forEach((item) => {
      const descriptionLines = wrapText(item.name, this.fonts.regular, 9, columns.descriptionWidth);
      const rowHeight = Math.max(22, (descriptionLines.length - 1) * TABLE_LINE_HEIGHT + 10);

      if (!this.hasSpace(rowHeight)) {
        this.addPage();
        drawTableHeader();
      }

      const rowTop = this.y + TABLE_ROW_PADDING;
      const textBlockHeight =
        (descriptionLines.length - 1) * TABLE_LINE_HEIGHT + TABLE_TEXT_ASCENT + TABLE_TEXT_DESCENT;
      const textTop = rowTop - (rowHeight - textBlockHeight) / 2;
      const textBaseline = textTop - TABLE_TEXT_ASCENT;
      const singleLineBlockHeight = TABLE_TEXT_ASCENT + TABLE_TEXT_DESCENT;
      const numericTop = rowTop - (rowHeight - singleLineBlockHeight) / 2;
      const numericBaseline = numericTop - TABLE_TEXT_ASCENT;

      let descriptionY = textBaseline;

      this.page.drawText(item.type, {
        x: columns.type,
        y: textBaseline,
        size: 7.5,
        font: this.fonts.bold,
        color: COLORS.muted,
      });

      for (const line of descriptionLines) {
        this.page.drawText(line, {
          x: columns.description,
          y: descriptionY,
          size: 9,
          font: this.fonts.regular,
          color: COLORS.text,
        });
        descriptionY -= TABLE_LINE_HEIGHT;
      }

      this.drawRightText(
        item.quantity,
        columns.quantityRight,
        numericBaseline,
        9,
        this.fonts.regular,
      );
      this.drawRightText(
        formatCurrency(item.unitPriceCents),
        columns.unitPriceRight,
        numericBaseline,
        9,
        this.fonts.regular,
      );
      this.drawRightText(
        formatCurrency(item.totalCents),
        columns.totalRight,
        numericBaseline,
        9,
        this.fonts.regular,
      );

      this.y -= rowHeight - 8;
      this.page.drawLine({
        start: { x: MARGIN, y: this.y },
        end: { x: PAGE_WIDTH - MARGIN, y: this.y },
        thickness: 0.4,
        color: COLORS.line,
      });
      this.y -= 8;
    });
  }

  drawTotal(totalCents: number): void {
    this.ensureSpace(50);
    const total = formatCurrency(totalCents);

    this.y -= 6;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 1.2,
      color: COLORS.brand,
    });
    this.y -= 18;
    this.drawRightText(
      'Total',
      TABLE_COLUMNS.unitPriceRight,
      this.y,
      9.5,
      this.fonts.bold,
      COLORS.muted,
    );
    this.drawRightText(
      total,
      TABLE_COLUMNS.totalRight,
      this.y - 2,
      14,
      this.fonts.bold,
      COLORS.ink,
    );
    this.y -= 33;
  }

  private drawRightText(
    text: string,
    rightX: number,
    y: number,
    size: number,
    font: PDFFont,
    color: RGB = COLORS.text,
  ): void {
    this.page.drawText(text, {
      x: rightX - font.widthOfTextAtSize(text, size),
      y,
      size,
      font,
      color,
    });
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
      page.drawRectangle({
        x: MARGIN,
        y: 25,
        width: 4,
        height: 4,
        color: COLORS.brand,
      });
      page.drawText('Serviço Certo · kawan.dev.br', {
        x: MARGIN + 9,
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

    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - 1,
      width: 5,
      height: 5,
      color: COLORS.brand,
    });
    this.page.drawText(`Comprovante da ordem de serviço #${this.data.order.protocol}`, {
      x: MARGIN + 12,
      y: this.y,
      size: 10,
      font: this.fonts.bold,
      color: COLORS.ink,
    });
    this.y -= 9;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.8,
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
