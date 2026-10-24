import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ProductsModule } from '../products/products.module.js';
import { ServicesModule } from '../services/services.module.js';
import { CreateServiceOrderUseCase } from './application/use-cases/create-service-order.use-case.js';
import { DeleteServiceOrderUseCase } from './application/use-cases/delete-service-order.use-case.js';
import { GenerateServiceOrderReceiptUseCase } from './application/use-cases/generate-service-order-receipt.use-case.js';
import { GetServiceOrderUseCase } from './application/use-cases/get-service-order.use-case.js';
import { ListServiceOrdersUseCase } from './application/use-cases/list-service-orders.use-case.js';
import { UpdateServiceOrderUseCase } from './application/use-cases/update-service-order.use-case.js';
import { SERVICE_ORDER_RECEIPT_PDF } from './application/ports/service-order-receipt-pdf.js';
import { SERVICE_ORDER_QUERIES } from './application/queries/service-order.queries.js';
import { SERVICE_ORDER_REPOSITORY } from './domain/repositories/service-order.repository.js';
import { KnexServiceOrderQueries } from './infrastructure/persistence/knex-service-order.queries.js';
import { KnexServiceOrderRepository } from './infrastructure/persistence/knex-service-order.repository.js';
import { PdfLibServiceOrderReceiptPdf } from './infrastructure/pdf/pdf-lib-service-order-receipt-pdf.js';
import { ServiceOrdersController } from './presentation/http/service-orders.controller.js';

@Module({
  imports: [IdentityModule, CustomersModule, ProductsModule, ServicesModule],
  controllers: [ServiceOrdersController],
  providers: [
    CreateServiceOrderUseCase,
    GetServiceOrderUseCase,
    UpdateServiceOrderUseCase,
    DeleteServiceOrderUseCase,
    ListServiceOrdersUseCase,
    GenerateServiceOrderReceiptUseCase,
    { provide: SERVICE_ORDER_REPOSITORY, useClass: KnexServiceOrderRepository },
    { provide: SERVICE_ORDER_QUERIES, useClass: KnexServiceOrderQueries },
    { provide: SERVICE_ORDER_RECEIPT_PDF, useClass: PdfLibServiceOrderReceiptPdf },
  ],
})
export class ServiceOrdersModule {}
