import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../../shared/application/ports/id-generator.js';
import { Product } from '../../domain/entities/product.js';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../domain/repositories/product.repository.js';
import { Price } from '../../domain/value-objects/price.js';

export type CreateProductCommand = {
  tenantId: string;
  name: string;
  description: string;
  priceCents: number;
};

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    const product = Product.create({
      id: this.ids.next(),
      tenantId: command.tenantId,
      name: command.name,
      description: command.description,
      price: Price.fromCents(command.priceCents),
      now: this.clock.now(),
    });

    await this.products.save(product);

    return product;
  }
}
