import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../domain/repositories/product.repository.js';
import { ProductNotFoundError } from '../errors/product.errors.js';

export type DeleteProductCommand = {
  tenantId: string;
  productId: string;
};

@Injectable()
export class DeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    const deleted = await this.products.softDelete(
      command.tenantId,
      command.productId,
      this.clock.now(),
    );

    if (!deleted) {
      throw new ProductNotFoundError();
    }
  }
}
