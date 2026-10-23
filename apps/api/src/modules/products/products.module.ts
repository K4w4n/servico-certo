import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case.js';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case.js';
import { GetProductUseCase } from './application/use-cases/get-product.use-case.js';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case.js';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case.js';
import { PRODUCT_REPOSITORY } from './domain/repositories/product.repository.js';
import { KnexProductRepository } from './infrastructure/persistence/knex-product.repository.js';
import { ProductsController } from './presentation/http/products.controller.js';

@Module({
  imports: [IdentityModule],
  controllers: [ProductsController],
  providers: [
    CreateProductUseCase,
    GetProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    ListProductsUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: KnexProductRepository },
  ],
})
export class ProductsModule {}
