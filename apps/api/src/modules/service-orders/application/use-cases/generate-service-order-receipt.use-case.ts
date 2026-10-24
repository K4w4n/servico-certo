import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import { TENANT_REPOSITORY } from '../../../identity/domain/repositories/tenant.repository.js';
import type { TenantRepository } from '../../../identity/domain/repositories/tenant.repository.js';
import {
  SERVICE_ORDER_RECEIPT_PDF,
  type ServiceOrderReceiptPdf,
} from '../ports/service-order-receipt-pdf.js';
import {
  SERVICE_ORDER_QUERIES,
  type ServiceOrderQueries,
} from '../queries/service-order.queries.js';
import {
  ServiceOrderNotFoundError,
  ServiceOrderTenantNotFoundError,
} from '../errors/service-order.errors.js';

export type GenerateServiceOrderReceiptCommand = {
  tenantId: string;
  serviceOrderId: string;
  generatedBy: {
    name: string;
    email: string;
  };
};

export type ServiceOrderReceipt = {
  buffer: Uint8Array;
  filename: string;
};

@Injectable()
export class GenerateServiceOrderReceiptUseCase {
  constructor(
    @Inject(SERVICE_ORDER_QUERIES) private readonly queries: ServiceOrderQueries,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SERVICE_ORDER_RECEIPT_PDF) private readonly pdf: ServiceOrderReceiptPdf,
  ) {}

  async execute(command: GenerateServiceOrderReceiptCommand): Promise<ServiceOrderReceipt> {
    const [order, tenant] = await Promise.all([
      this.queries.findById(command.tenantId, command.serviceOrderId),
      this.tenants.findById(command.tenantId),
    ]);

    if (!order) {
      throw new ServiceOrderNotFoundError();
    }

    if (!tenant) {
      throw new ServiceOrderTenantNotFoundError();
    }

    const buffer = await this.pdf.generate({
      order,
      tenant: {
        name: tenant.name,
        domain: tenant.domain.value,
      },
      generatedAt: this.clock.now(),
      generatedBy: command.generatedBy,
    });

    return {
      buffer,
      filename: `comprovante-ordem-${order.protocol}.pdf`,
    };
  }
}
