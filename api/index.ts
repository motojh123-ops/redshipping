import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';

let cachedServer: express.Express | null = null;

async function bootstrapServer(): Promise<express.Express> {
  if (cachedServer) return cachedServer;

  // Require compiled AppModule and middleware from apps/api/dist
  const { AppModule } = require('../apps/api/dist/app.module');
  const { ValidationPipe } = require('@nestjs/common');
  const { GlobalExceptionFilter } = require('../apps/api/dist/common/filters/global-exception.filter');
  const { TransformInterceptor } = require('../apps/api/dist/common/interceptors/transform.interceptor');

  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  cachedServer = server;
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  try {
    const server = await bootstrapServer();
    return server(req, res);
  } catch (err: any) {
    console.error('Serverless execution error:', err);
    res.status(500).json({
      statusCode: 500,
      message: err?.message || 'Internal Serverless Error',
      timestamp: new Date().toISOString(),
    });
  }
}
