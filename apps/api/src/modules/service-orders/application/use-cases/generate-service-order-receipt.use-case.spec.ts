import { describe, expect, it, vi } from 'vitest';
import { Tenant } from '../../../identity/domain/entities/tenant.js';
import { TenantDomain } from '../../../identity/domain/value-objects/tenant-domain.js';
import type { TenantRepository } from '../../../identity/domain/repositories/tenant.repository.js';
import type { ServiceOrderReceiptPdf } from '../ports/service-order-receipt-pdf.js';
import type { ServiceOrderReceiptImage } from '../ports/service-order-receipt-image.js';
import type { ServiceOrderQueries, ServiceOrderView } from '../queries/service-order.queries.js';
import {
  ServiceOrderNotFoundError,
  ServiceOrderTenantNotFoundError,
} from '../errors/service-order.errors.js';
import { GenerateServiceOrderReceiptUseCase } from './generate-service-order-receipt.use-case.js';

const now = new Date('2026-10-24T12:00:00.000Z');
const tenant = Tenant.create({
  id: 'tenant-1',
  name: 'Oficina do João',
  domain: TenantDomain.create('oficina-do-joao'),
  now,
});
const order: ServiceOrderView = {
  id: 'order-1',
  protocol: '100001',
  note: 'Troca de óleo',
  customer: {
    id: 'customer-1',
    name: 'Ana Souza',
    address: 'Rua das Flores, 10',
    document: '52998224725',
    documentType: 'CPF',
    phoneNumber: '11999998888',
  },
  createdBy: {
    id: 'account-1',
    name: 'João',
    email: 'joao@exemplo.com',
  },
  products: [
    {
      productId: 'product-1',
      name: 'Óleo 5W30',
      unitPriceCents: 3500,
      quantity: 2,
      totalCents: 7000,
    },
  ],
  services: [
    {
      serviceId: 'service-1',
      name: 'Troca de óleo',
      priceCents: 12000,
    },
  ],
  totalCents: 19000,
  createdAt: now,
  updatedAt: now,
};

function createDependencies() {
  const queries = {
    findById: vi.fn().mockResolvedValue(order),
    list: vi.fn(),
  } as unknown as ServiceOrderQueries;
  const tenants = {
    findById: vi.fn().mockResolvedValue(tenant),
    findByDomain: vi.fn(),
    existsByDomain: vi.fn(),
    save: vi.fn(),
  } as unknown as TenantRepository;
  const pdf = {
    generate: vi.fn().mockResolvedValue(Buffer.from('%PDF-comprovante')),
  } as unknown as ServiceOrderReceiptPdf;
  const image = {
    render: vi.fn().mockResolvedValue(Buffer.from('%PNG-comprovante')),
  } as unknown as ServiceOrderReceiptImage;

  return { queries, tenants, pdf, image };
}

describe('GenerateServiceOrderReceiptUseCase', () => {
  it('gera o comprovante com tenant, criador da ordem e dados de emissão', async () => {
    const { queries, tenants, pdf, image } = createDependencies();
    const useCase = new GenerateServiceOrderReceiptUseCase(
      queries,
      tenants,
      { now: () => now },
      pdf,
      image,
    );

    const receipt = await useCase.execute({
      tenantId: 'tenant-1',
      serviceOrderId: 'order-1',
      generatedBy: {
        name: 'Maria',
        email: 'maria@exemplo.com',
      },
    });

    expect(receipt.filename).toBe('comprovante-ordem-100001.pdf');
    expect(receipt.contentType).toBe('application/pdf');
    expect(receipt.buffer.toString()).toBe('%PDF-comprovante');
    expect(vi.mocked(pdf.generate)).toHaveBeenCalledWith({
      order,
      tenant: {
        name: 'Oficina do João',
        domain: 'oficina-do-joao',
      },
      generatedAt: now,
      generatedBy: {
        name: 'Maria',
        email: 'maria@exemplo.com',
      },
    });
  });

  it('gera o comprovante em imagem quando solicitado', async () => {
    const { queries, tenants, pdf, image } = createDependencies();
    const useCase = new GenerateServiceOrderReceiptUseCase(
      queries,
      tenants,
      { now: () => now },
      pdf,
      image,
    );

    const receipt = await useCase.execute({
      tenantId: 'tenant-1',
      serviceOrderId: 'order-1',
      generatedBy: { name: 'Maria', email: 'maria@exemplo.com' },
      format: 'image',
    });

    expect(receipt.filename).toBe('comprovante-ordem-100001.png');
    expect(receipt.contentType).toBe('image/png');
    expect(receipt.buffer.toString()).toBe('%PNG-comprovante');
    expect(vi.mocked(image.render)).toHaveBeenCalledWith(Buffer.from('%PDF-comprovante'));
  });

  it('rejeita ordem inexistente', async () => {
    const { queries, tenants, pdf, image } = createDependencies();
    vi.mocked(queries.findById).mockResolvedValueOnce(null);
    const useCase = new GenerateServiceOrderReceiptUseCase(
      queries,
      tenants,
      { now: () => now },
      pdf,
      image,
    );

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        serviceOrderId: 'order-1',
        generatedBy: { name: 'Maria', email: 'maria@exemplo.com' },
      }),
    ).rejects.toBeInstanceOf(ServiceOrderNotFoundError);
  });

  it('rejeita tenant inexistente', async () => {
    const { queries, tenants, pdf, image } = createDependencies();
    vi.mocked(tenants.findById).mockResolvedValueOnce(null);
    const useCase = new GenerateServiceOrderReceiptUseCase(
      queries,
      tenants,
      { now: () => now },
      pdf,
      image,
    );

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        serviceOrderId: 'order-1',
        generatedBy: { name: 'Maria', email: 'maria@exemplo.com' },
      }),
    ).rejects.toBeInstanceOf(ServiceOrderTenantNotFoundError);
  });
});
