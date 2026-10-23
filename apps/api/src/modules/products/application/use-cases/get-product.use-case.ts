import { Inject, Injectable } from '@nestjs/common';
import type { Product } from '../../domain/entities/product.js';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../domain/repositories/product.repository.js';
import { ProductNotFoundError } from '../errors/product.errors.js';

export type GetProductCommand = {
  tenantId: string;
  productId: string;
};

@Injectable()
export class GetProductUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}

  async execute(command: GetProductCommand): Promise<Product> {
    const product = await this.products.findById(command.tenantId, command.productId);

    if (!product) {
      throw new ProductNotFoundError();
    }

    return product;
  }
}
