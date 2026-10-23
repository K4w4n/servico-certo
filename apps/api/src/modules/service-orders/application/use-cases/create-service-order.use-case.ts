import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../../shared/application/ports/id-generator.js';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../../../shared/application/ports/unit-of-work.js';
import { CUSTOMER_REPOSITORY } from '../../../customers/domain/repositories/customer.repository.js';
import type { CustomerRepository } from '../../../customers/domain/repositories/customer.repository.js';
import { PRODUCT_REPOSITORY } from '../../../products/domain/repositories/product.repository.js';
import type { ProductRepository } from '../../../products/domain/repositories/product.repository.js';
import { SERVICE_REPOSITORY } from '../../../services/domain/repositories/service.repository.js';
import type { ServiceRepository } from '../../../services/domain/repositories/service.repository.js';
import { ServiceOrder } from '../../domain/entities/service-order.js';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/repositories/service-order.repository.js';
import type { ServiceOrderRepository } from '../../domain/repositories/service-order.repository.js';
import {
  SERVICE_ORDER_QUERIES,
  type ServiceOrderQueries,
  type ServiceOrderView,
} from '../queries/service-order.queries.js';
import {
  ServiceOrderCustomerNotFoundError,
  ServiceOrderNotFoundError,
  ServiceOrderProductNotFoundError,
  ServiceOrderServiceNotFoundError,
} from '../errors/service-order.errors.js';

export type CreateServiceOrderProductCommand = {
  productId: string;
  unitPriceCents: number;
  quantity: number;
};

export type CreateServiceOrderServiceCommand = {
  serviceId: string;
  priceCents: number;
};

export type CreateServiceOrderCommand = {
  tenantId: string;
  customerId: string;
  note?: string | null;
  products: CreateServiceOrderProductCommand[];
  services: CreateServiceOrderServiceCommand[];
};

@Injectable()
export class CreateServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY) private readonly orders: ServiceOrderRepository,
    @Inject(SERVICE_ORDER_QUERIES) private readonly queries: ServiceOrderQueries,
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateServiceOrderCommand): Promise<ServiceOrderView> {
    const productIds = [...new Set(command.products.map((item) => item.productId))];
    const serviceIds = [...new Set(command.services.map((item) => item.serviceId))];

    const [customer, catalogProducts, catalogServices] = await Promise.all([
      this.customers.findById(command.tenantId, command.customerId),
      this.products.findByIds(command.tenantId, productIds),
      this.services.findByIds(command.tenantId, serviceIds),
    ]);

    if (!customer) {
      throw new ServiceOrderCustomerNotFoundError();
    }

    const productsById = new Map(catalogProducts.map((product) => [product.id, product]));
    const servicesById = new Map(catalogServices.map((service) => [service.id, service]));

    const products = command.products.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new ServiceOrderProductNotFoundError();
      }

      return {
        productId: item.productId,
        name: product.name,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
      };
    });

    const services = command.services.map((item) => {
      const service = servicesById.get(item.serviceId);

      if (!service) {
        throw new ServiceOrderServiceNotFoundError();
      }

      return {
        serviceId: item.serviceId,
        name: service.name,
        priceCents: item.priceCents,
      };
    });

    const order = await this.uow.run(async () => {
      const protocol = await this.orders.nextProtocol(command.tenantId);
      const created = ServiceOrder.create({
        id: this.ids.next(),
        tenantId: command.tenantId,
        protocol,
        customerId: command.customerId,
        note: command.note ?? null,
        products,
        services,
        now: this.clock.now(),
      });

      await this.orders.save(created);
      await this.orders.replaceItems(created);

      return created;
    });

    const view = await this.queries.findById(command.tenantId, order.id);

    if (!view) {
      throw new ServiceOrderNotFoundError();
    }

    return view;
  }
}
