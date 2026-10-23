import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
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
import { ServiceOrderItemsRequiredError } from '../../domain/errors/service-order.errors.js';
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
import type {
  CreateServiceOrderProductCommand,
  CreateServiceOrderServiceCommand,
} from './create-service-order.use-case.js';

export type UpdateServiceOrderCommand = {
  tenantId: string;
  serviceOrderId: string;
  customerId?: string;
  note?: string | null;
  products?: CreateServiceOrderProductCommand[];
  services?: CreateServiceOrderServiceCommand[];
};

@Injectable()
export class UpdateServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY) private readonly orders: ServiceOrderRepository,
    @Inject(SERVICE_ORDER_QUERIES) private readonly queries: ServiceOrderQueries,
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateServiceOrderCommand): Promise<ServiceOrderView> {
    const order = await this.orders.findById(command.tenantId, command.serviceOrderId);

    if (!order) {
      throw new ServiceOrderNotFoundError();
    }

    const productIds =
      command.products === undefined
        ? []
        : [...new Set(command.products.map((item) => item.productId))];
    const serviceIds =
      command.services === undefined
        ? []
        : [...new Set(command.services.map((item) => item.serviceId))];

    const [customer, catalogProducts, catalogServices] = await Promise.all([
      command.customerId === undefined
        ? Promise.resolve(undefined)
        : this.customers.findById(command.tenantId, command.customerId),
      this.products.findByIds(command.tenantId, productIds),
      this.services.findByIds(command.tenantId, serviceIds),
    ]);

    if (command.customerId !== undefined && !customer) {
      throw new ServiceOrderCustomerNotFoundError();
    }

    const existingProducts = new Map(order.products.map((item) => [item.productId, item]));
    const existingServices = new Map(order.services.map((item) => [item.serviceId, item]));
    const productsById = new Map(catalogProducts.map((product) => [product.id, product]));
    const servicesById = new Map(catalogServices.map((service) => [service.id, service]));

    const products =
      command.products === undefined
        ? undefined
        : command.products.map((item) => {
            const product = productsById.get(item.productId);

            if (!product) {
              throw new ServiceOrderProductNotFoundError();
            }

            const existing = existingProducts.get(item.productId);

            return {
              productId: item.productId,
              name: existing?.name ?? product.name,
              unitPriceCents: item.unitPriceCents,
              quantity: item.quantity,
            };
          });

    const services =
      command.services === undefined
        ? undefined
        : command.services.map((item) => {
            const service = servicesById.get(item.serviceId);

            if (!service) {
              throw new ServiceOrderServiceNotFoundError();
            }

            const existing = existingServices.get(item.serviceId);

            return {
              serviceId: item.serviceId,
              name: existing?.name ?? service.name,
              priceCents: item.priceCents,
            };
          });

    const now = this.clock.now();

    if (command.customerId !== undefined) {
      order.changeCustomer(command.customerId, now);
    }

    if (command.note !== undefined) {
      order.changeNote(command.note, now);
    }

    if (products !== undefined) {
      order.replaceProducts(products, now);
    }

    if (services !== undefined) {
      order.replaceServices(services, now);
    }

    if (!order.hasItems) {
      throw new ServiceOrderItemsRequiredError();
    }

    await this.uow.run(async () => {
      await this.orders.save(order);

      if (products !== undefined || services !== undefined) {
        await this.orders.replaceItems(order);
      }
    });

    const view = await this.queries.findById(command.tenantId, order.id);

    if (!view) {
      throw new ServiceOrderNotFoundError();
    }

    return view;
  }
}
