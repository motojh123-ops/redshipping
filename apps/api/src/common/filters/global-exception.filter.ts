import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal server error occurred';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message || exception.message;
        code = obj.error || `HTTP_${status}`;
        if (Array.isArray(obj.message)) {
          details = obj.message;
          message = 'Validation failed';
          code = 'VALIDATION_FAILED';
        }
      }

      // In production, sanitize 500-level HttpException messages
      if (isProd && status >= 500) {
        message = 'An unexpected server error occurred';
        code = 'INTERNAL_SERVER_ERROR';
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception at ${request.method} ${request.url}: ${exception.message}`, exception.stack);
      message = isProd ? 'An internal server error occurred' : exception.message;
    } else {
      this.logger.error(`Unknown Exception at ${request.method} ${request.url}: ${String(exception)}`);
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
