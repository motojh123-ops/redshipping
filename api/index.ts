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
    bodyParser: false,
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
      const origin = request.headers.get('Origin') || '*';

      // Fast-path CORS preflight
      if (request.method.toUpperCase() === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      // Fast-path health check without waiting for full NestJS bootstrap
      if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/ping') {
        return new Response(JSON.stringify({ status: 'ok', service: 'RED SHIPPING API (Cloudflare Worker)' }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          },
        });
      }

      const expressApp = await bootstrapServer(env);

      return new Promise(async (resolve) => {
        const rawText = ['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())
          ? await request.text()
          : '';

        let bodyData: any = {};
        if (rawText) {
          try {
            bodyData = JSON.parse(rawText);
          } catch (e) {
            bodyData = {};
          }
        }

        const { Readable } = require('node:stream');
        const stream = Readable.from(rawText ? [Buffer.from(rawText, 'utf8')] : []);

        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
        const headersObj = Object.fromEntries(request.headers.entries());

        const mockSocket: any = {
          remoteAddress: clientIp,
          remotePort: 443,
          encrypted: true,
          destroy: () => {},
          end: () => {},
          address: () => ({ address: clientIp, family: 'IPv4', port: 443 }),
        };

        const req: any = stream;
        req.method = request.method;
        req.url = url.pathname + url.search;
        req.originalUrl = url.pathname + url.search;
        req.headers = headersObj;
        req.rawHeaders = [];
        req.query = Object.fromEntries(url.searchParams.entries());
        req.body = bodyData;
        req.ip = clientIp;
        req.ips = [clientIp];
        req.socket = mockSocket;
        req.connection = mockSocket;
        req.get = (name: string) => headersObj[name.toLowerCase()];
        req.header = (name: string) => headersObj[name.toLowerCase()];

        Object.defineProperty(req, 'ip', { value: clientIp, writable: true, configurable: true, enumerable: true });
        Object.defineProperty(req, 'ips', { value: [clientIp], writable: true, configurable: true, enumerable: true });
        Object.defineProperty(req, 'socket', { value: mockSocket, writable: true, configurable: true, enumerable: true });
        Object.defineProperty(req, 'connection', { value: mockSocket, writable: true, configurable: true, enumerable: true });

        const resHeaders = new Headers();
        let statusCode = 200;
        resHeaders.set('Access-Control-Allow-Origin', origin);
        resHeaders.set('Access-Control-Allow-Credentials', 'true');

        const res: any = {
          statusCode: 200,
          locals: {},
          setHeader(name: string, value: string) {
            resHeaders.set(name, value);
          },
          getHeader(name: string) {
            return resHeaders.get(name);
          },
          status(code: number) {
            statusCode = code;
            res.statusCode = code;
            return res;
          },
          writeHead(code: number, headers?: any) {
            statusCode = code;
            res.statusCode = code;
            if (headers) {
              for (const [k, v] of Object.entries(headers)) {
                resHeaders.set(k, String(v));
              }
            }
            return res;
          },
          json(data: any) {
            resHeaders.set('Content-Type', 'application/json');
            resolve(new Response(JSON.stringify(data), { status: statusCode, headers: resHeaders }));
          },
          send(data: any) {
            if (typeof data === 'object' && !(data instanceof Uint8Array)) {
              resHeaders.set('Content-Type', 'application/json');
              resolve(new Response(JSON.stringify(data), { status: statusCode, headers: resHeaders }));
            } else {
              resolve(new Response(data, { status: statusCode, headers: resHeaders }));
            }
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
