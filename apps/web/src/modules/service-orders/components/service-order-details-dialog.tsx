'use client';

import { ChevronDown, Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ServiceOrder, ServiceOrderReceiptFormat } from '@servico-certo/contracts';
import { formatDocument, formatPhoneNumber } from '@/modules/customers/lib/customer-format';
import type { ApiClient } from '@/shared/lib/api-client';
import { cn } from '@/shared/lib/cn';
import { formatPrice } from '@/shared/lib/price';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { getServiceOrderErrorMessage } from '../lib/service-order-errors';
import { formatProtocol, formatServiceOrderDate } from '../lib/service-order-format';
import { downloadServiceOrderReceipt } from '../lib/service-order-receipt';

type ServiceOrderDetailsDialogProps = {
  order: ServiceOrder;
  tenantName: string;
  download: ApiClient['download'];
  onClose: () => void;
};

function ItemTypeBadge({ type }: { type: 'product' | 'service' }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase',
        type === 'product'
          ? 'border-brand/25 bg-brand/10 text-brand'
          : 'border-white/10 bg-white/5 text-fog/70',
      )}
    >
      {type === 'product' ? 'Produto' : 'Serviço'}
    </span>
  );
}

export function ServiceOrderDetailsDialog({
  order,
  tenantName,
  download,
  onClose,
}: ServiceOrderDetailsDialogProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<ServiceOrderReceiptFormat | null>(
    null,
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDownloading = downloadingFormat !== null;

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isMenuOpen]);

  async function handleDownload(format: ServiceOrderReceiptFormat) {
    setDownloadError(null);
    setDownloadingFormat(format);
    setIsMenuOpen(false);

    try {
      await downloadServiceOrderReceipt(download, order.id, format);
    } catch (error) {
      setDownloadError(
        getServiceOrderErrorMessage(
          error,
          format === 'image'
            ? 'Não foi possível gerar o comprovante em imagem.'
            : 'Não foi possível gerar o comprovante em PDF.',
        ),
      );
    } finally {
      setDownloadingFormat(null);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      closeDisabled={isDownloading}
      title={`Ordem de serviço ${formatProtocol(order.protocol)}`}
      description={`${tenantName} · Criada em ${formatServiceOrderDate(order.createdAt)}`}
      className="max-w-3xl"
    >
      <div className="flex flex-col gap-5">
        {downloadError ? <Alert variant="destructive">{downloadError}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-xs font-semibold tracking-wide text-fog/45 uppercase">Cliente</h3>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div>
                <dt className="sr-only">Nome</dt>
                <dd className="font-medium">{order.customer.name}</dd>
              </div>
              {order.customer.document && order.customer.documentType ? (
                <div className="flex flex-wrap gap-1">
                  <dt className="text-fog/45">{order.customer.documentType}:</dt>
                  <dd>{formatDocument(order.customer.document)}</dd>
                </div>
              ) : null}
              {order.customer.phoneNumber ? (
                <div className="flex flex-wrap gap-1">
                  <dt className="text-fog/45">Telefone:</dt>
                  <dd>{formatPhoneNumber(order.customer.phoneNumber)}</dd>
                </div>
              ) : null}
              {order.customer.address ? (
                <div className="flex flex-wrap gap-1">
                  <dt className="text-fog/45">Endereço:</dt>
                  <dd>{order.customer.address}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-xs font-semibold tracking-wide text-fog/45 uppercase">Ordem</h3>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-fog/45">Criada em</dt>
                <dd>{formatServiceOrderDate(order.createdAt)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-fog/45">Última atualização</dt>
                <dd>{formatServiceOrderDate(order.updatedAt)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-fog/45">Criada por</dt>
                <dd className="text-right">
                  {order.createdBy ? (
                    <>
                      <span className="block">{order.createdBy.name}</span>
                      <span className="block text-xs text-fog/45">{order.createdBy.email}</span>
                    </>
                  ) : (
                    'Não informado'
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Itens
          </h3>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-[11px] tracking-[0.12em] text-fog/45 uppercase">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Tipo
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Descrição
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Qtd.
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Unitário
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((item) => (
                  <tr key={`product-${item.productId}`} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <ItemTypeBadge type="product" />
                    </td>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {formatPrice(item.unitPriceCents)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {formatPrice(item.totalCents)}
                    </td>
                  </tr>
                ))}
                {order.services.map((item) => (
                  <tr key={`service-${item.serviceId}`} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <ItemTypeBadge type="service" />
                    </td>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2 text-right">1</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {formatPrice(item.priceCents)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {formatPrice(item.priceCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.04]">
                  <th scope="row" colSpan={3} className="px-3 py-2 text-right font-medium">
                    Total
                  </th>
                  <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                    {formatPrice(order.totalCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {order.note ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Observação
            </h3>
            <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm whitespace-pre-wrap">
              {order.note}
            </p>
          </section>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isDownloading}>
            Fechar
          </Button>

          <div
            ref={menuRef}
            className="relative"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && isMenuOpen) {
                event.stopPropagation();
                setIsMenuOpen(false);
              }
            }}
          >
            <Button
              variant="brand"
              onClick={() => setIsMenuOpen((current) => !current)}
              disabled={isDownloading}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-controls="receipt-download-options"
            >
              {isDownloading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {downloadingFormat === 'image'
                ? 'Gerando imagem…'
                : downloadingFormat === 'pdf'
                  ? 'Gerando PDF…'
                  : 'Baixar comprovante'}
              <ChevronDown
                aria-hidden="true"
                className={cn('transition-transform', isMenuOpen && 'rotate-180')}
              />
            </Button>

            {isMenuOpen ? (
              <div
                id="receipt-download-options"
                role="menu"
                aria-label="Formato do comprovante"
                className="absolute right-0 bottom-full z-20 mb-2 w-52 rounded-xl border border-white/15 bg-surface-raised p-1 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleDownload('pdf')}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fog/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none"
                >
                  <FileText aria-hidden="true" className="size-4 text-brand" />
                  Arquivo PDF
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleDownload('image')}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fog/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none"
                >
                  <ImageIcon aria-hidden="true" className="size-4 text-brand" />
                  Arquivo em Imagem
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
