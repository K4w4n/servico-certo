'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import type { ServiceOrder } from '@servico-certo/contracts';
import { formatDocument, formatPhoneNumber } from '@/modules/customers/lib/customer-format';
import type { ApiClient } from '@/shared/lib/api-client';
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

export function ServiceOrderDetailsDialog({
  order,
  tenantName,
  download,
  onClose,
}: ServiceOrderDetailsDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloadError(null);
    setIsDownloading(true);

    try {
      await downloadServiceOrderReceipt(
        download,
        order.id,
        `comprovante-ordem-${order.protocol}.pdf`,
      );
    } catch (error) {
      setDownloadError(
        getServiceOrderErrorMessage(error, 'Não foi possível gerar o comprovante em PDF.'),
      );
    } finally {
      setIsDownloading(false);
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
          <Button variant="brand" onClick={handleDownload} disabled={isDownloading}>
            <Download aria-hidden="true" />
            {isDownloading ? 'Gerando PDF…' : 'Baixar comprovante PDF'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
