import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  type ProductListResult,
  type ProductRepository,
} from '../../domain/repositories/product.repository.js';

export type ListProductsCommand = {
  tenantId: string;
  limit: number;
  offset: number;
  name?: string;
};

@Injectable()
export class ListProductsUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}

  async execute(command: ListProductsCommand): Promise<ProductListResult> {
    return this.products.list({
      tenantId: command.tenantId,
      limit: command.limit,
      offset: command.offset,
      ...(command.name ? { name: command.name } : {}),
    });
  }
}
