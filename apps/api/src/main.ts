import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  // Security HTTP Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI to render safely
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Strict CORS Policy
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || (!isProd && origin.startsWith('http://localhost:'))) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'Accept'],
  });

  // Global Route Prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Transform Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('RED SHIPPING / Banna ERP API')
    .setDescription('Freight Forwarding & Customs Clearance Multi-Tenant Enterprise API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 ERP Backend API is running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger Documentation is available on: http://localhost:${port}/docs`);
}

bootstrap();
