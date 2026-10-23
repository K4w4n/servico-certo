import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { validateEnv } from './shared/config/env.js';
import { SharedModule } from './shared/shared.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    DatabaseModule,
    SharedModule,
    HealthModule,
    IdentityModule,
    CustomersModule,
    ProductsModule,
    ServicesModule,
  ],
})
export class AppModule {}
