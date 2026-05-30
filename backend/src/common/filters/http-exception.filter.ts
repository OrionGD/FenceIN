import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception && typeof exception === 'object' && 'code' in exception) {
      const error = exception as { code: string; message?: string; meta?: any };
      if (error.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = error.meta?.target ? ` on fields: (${error.meta.target.join(', ')})` : '';
        message = `Unique constraint failed${target}`;
      } else if (error.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = error.meta?.cause || 'Record not found';
      } else if (error.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = `Foreign key constraint failed on field: ${error.meta?.field_name || 'unknown'}`;
      }
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : 'Unknown stack',
    );

    response.status(status).json({
      success: false,
      error: {
        code: status,
        message: typeof message === 'string' ? message : (message as any).message || message,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
