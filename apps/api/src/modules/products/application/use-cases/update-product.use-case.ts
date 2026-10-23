import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import type { Product } from '../../domain/entities/product.js';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../domain/repositories/product.repository.js';
import { Price } from '../../domain/value-objects/price.js';
import { ProductNotFoundError } from '../errors/product.errors.js';

export type UpdateProductCommand = {
  tenantId: string;
  productId: string;
  name?: string;
  description?: string;
  priceCents?: number;
};

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateProductCommand): Promise<Product> {
    const product = await this.products.findById(command.tenantId, command.productId);

    if (!product) {
      throw new ProductNotFoundError();
    }

    const now = this.clock.now();

    if (command.name !== undefined) {
      product.changeName(command.name, now);
    }

    if (command.description !== undefined) {
      product.changeDescription(command.description, now);
    }

    if (command.priceCents !== undefined) {
      product.changePrice(Price.fromCents(command.priceCents), now);
    }

    await this.products.save(product);

    return product;
  }
}
