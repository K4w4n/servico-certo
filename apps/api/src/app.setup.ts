import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter.js';

export function configureApp(app: INestApplication, options: { swagger?: boolean } = {}): void {
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin:
      process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  if (options.swagger && process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Serviço Certo API')
      .setDescription('API do sistema de Ordens de Serviço Serviço Certo.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();

    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }
}
