if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = '/';
}
if (typeof (globalThis as any).__filename === 'undefined') {
  (globalThis as any).__filename = '/index.js';
}

import 'reflect-metadata';

let cachedServer: any = null;
let cachedEnvHash: string | null = null;

/** Allowed origins for CORS — vercel preview/prod domains auto-allowed */
function isAllowedOrigin(origin: string | null, env: any): boolean {
  if (!origin) return false;
  // Allow all vercel preview/prod deploys
  if (/\.vercel\.app$/.test(origin)) return true;
  // Allow localhost for development
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Allow configured custom origins
  const allowed = (env?.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  return allowed.includes(origin);
}

/** Simple hash of env keys+values to detect binding changes */
function envHash(env: any): string {
  if (!env) return '';
  return Object.keys(env).sort().map(k => `${k}=${typeof env[k] === 'string' ? env[k].slice(0, 8) : ''}`).join('|');
}

async function bootstrapServer(env: any) {
  const currentHash = envHash(env);
  if (cachedServer && cachedEnvHash === currentHash) return cachedServer;
  // Env changed (e.g. secret rotation) — rebuild
  cachedServer = null;
  cachedEnvHash = currentHash;

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
      const origin = request.headers.get('Origin');
      const allowed = isAllowedOrigin(origin, env);

      // Build CORS headers — echo origin only when explicitly allowed
      const corsHeaders: Record<string, string> = allowed && origin
        ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        : {
            'Access-Control-Allow-Origin': '*',
            // Note: no Allow-Credentials with wildcard — browsers reject it
          };

      // Fast-path CORS preflight
      if (request.method.toUpperCase() === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization',
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
            ...corsHeaders,
          },
        });
      }

      const expressApp = await bootstrapServer(env);

      return new Promise(async (resolve) => {
        const contentType = (request.headers.get('content-type') || '').toLowerCase();
        const isMultipart = contentType.includes('multipart/form-data');
        const isUrlEncoded = contentType.includes('application/x-www-form-urlencoded');
        const hasBody = ['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase());

        let rawBuffer: ArrayBuffer | null = null;
        let rawText = '';
        let bodyData: any = {};

        if (hasBody) {
          if (isMultipart) {
            // For multipart, keep the raw bytes so Express/multer can parse them
            rawBuffer = await request.arrayBuffer();
            rawText = ''; // don't parse as text
          } else {
            rawText = await request.text();
            if (rawText) {
              if (isUrlEncoded) {
                // Parse URL-encoded form data
                const params = new URLSearchParams(rawText);
                bodyData = Object.fromEntries(params.entries());
              } else {
                try {
                  bodyData = JSON.parse(rawText);
                } catch (e) {
                  bodyData = {};
                }
              }
            }
          }
        }

        const { Readable } = require('node:stream');
        const bodyBytes = rawBuffer
          ? Buffer.from(rawBuffer)
          : rawText ? Buffer.from(rawText, 'utf8') : null;
        const stream = Readable.from(bodyBytes ? [bodyBytes] : []);

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
        // Apply CORS headers to response
        for (const [k, v] of Object.entries(corsHeaders)) {
          resHeaders.set(k, v);
        }

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
      const isDev = (env?.NODE_ENV || process.env.NODE_ENV) !== 'production';
      const body: any = { statusCode: 500, message: err?.message || 'Worker Internal Error' };
      if (isDev) body.stack = err?.stack; // Never leak stack traces in production
      return new Response(JSON.stringify(body), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
