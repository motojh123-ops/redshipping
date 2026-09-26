if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = '/';
}
if (typeof (globalThis as any).__filename === 'undefined') {
  (globalThis as any).__filename = '/index.js';
}

import 'reflect-metadata';

let cachedServer: any = null;

async function bootstrapServer(env: any) {
  if (cachedServer) return cachedServer;

  if (env) {
    for (const key of Object.keys(env)) {
      if (typeof env[key] === 'string') {
        process.env[key] = env[key];
      }
    }
  }

  const { NestFactory } = require('@nestjs/core');
  const { ExpressAdapter } = require('@nestjs/platform-express');
  const express = require('express');

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

export default {
  async fetch(request: any, env: any, ctx: any): Promise<any> {
    try {
      const url = new URL(request.url);

      // Fast-path health check without waiting for full NestJS bootstrap
      if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/ping') {
        return new Response(JSON.stringify({ status: 'ok', service: 'RED SHIPPING API (Cloudflare Worker)' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const expressApp = await bootstrapServer(env);

      return new Promise(async (resolve) => {
        let bodyData: any = null;
        if (['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
          try {
            bodyData = await request.json();
          } catch (e) {
            bodyData = {};
          }
        }

        const req: any = {
          method: request.method,
          url: url.pathname + url.search,
          headers: Object.fromEntries(request.headers.entries()),
          query: Object.fromEntries(url.searchParams.entries()),
          body: bodyData,
        };

        const resHeaders = new Headers();
        let statusCode = 200;

        const res: any = {
          statusCode: 200,
          setHeader(name: string, value: string) {
            resHeaders.set(name, value);
          },
          getHeader(name: string) {
            return resHeaders.get(name);
          },
          status(code: number) {
            statusCode = code;
            return res;
          },
          json(data: any) {
            resHeaders.set('Content-Type', 'application/json');
            resolve(new Response(JSON.stringify(data), { status: statusCode, headers: resHeaders }));
          },
          send(data: any) {
            resolve(new Response(data, { status: statusCode, headers: resHeaders }));
          },
          end(data?: any) {
            resolve(new Response(data || '', { status: statusCode, headers: resHeaders }));
          },
        };

        expressApp(req, res);
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ statusCode: 500, message: err?.message || 'Worker Internal Error', stack: err?.stack }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
