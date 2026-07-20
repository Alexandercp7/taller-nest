import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exceptions';

const STATUS_CODES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

@Catch(DomainException, HttpException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException | HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { statusCode, error, message } = this.resolve(exception);

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: DomainException | HttpException): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof DomainException) {
      return {
        statusCode: exception.statusCode,
        error: exception.code,
        message: exception.message,
      };
    }

    const statusCode = exception.getStatus();
    const body = exception.getResponse();
    const message =
      typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] }).message ??
          exception.message);

    return {
      statusCode,
      error: STATUS_CODES[statusCode] ?? 'UNKNOWN_ERROR',
      message,
    };
  }
}
