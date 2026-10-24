import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';

const APP_ERROR_STATUS: Record<string, number> = {
  INVALID_EMAIL: HttpStatus.BAD_REQUEST,
  INVALID_TENANT_DOMAIN: HttpStatus.BAD_REQUEST,
  INVALID_TENANT_NAME: HttpStatus.BAD_REQUEST,
  INVALID_ACCOUNT_NAME: HttpStatus.BAD_REQUEST,
  INVALID_PASSWORD_HASH: HttpStatus.BAD_REQUEST,
  INVALID_REFRESH_TOKEN_DATA: HttpStatus.BAD_REQUEST,
  INVALID_PASSWORD_RESET_TOKEN_DATA: HttpStatus.BAD_REQUEST,
  INVALID_RESET_TOKEN: HttpStatus.BAD_REQUEST,
  WEAK_PASSWORD: HttpStatus.BAD_REQUEST,
  ACCOUNT_NOT_FOUND: HttpStatus.NOT_FOUND,
  CANNOT_BLOCK_SELF: HttpStatus.CONFLICT,
  INVALID_CUSTOMER_NAME: HttpStatus.BAD_REQUEST,
  INVALID_ADDRESS: HttpStatus.BAD_REQUEST,
  INVALID_DOCUMENT: HttpStatus.BAD_REQUEST,
  INVALID_PHONE_NUMBER: HttpStatus.BAD_REQUEST,
  CUSTOMER_NOT_FOUND: HttpStatus.NOT_FOUND,
  DOCUMENT_TAKEN: HttpStatus.CONFLICT,
  INVALID_PRODUCT_NAME: HttpStatus.BAD_REQUEST,
  INVALID_PRODUCT_DESCRIPTION: HttpStatus.BAD_REQUEST,
  INVALID_PRICE: HttpStatus.BAD_REQUEST,
  PRODUCT_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVALID_SERVICE_NAME: HttpStatus.BAD_REQUEST,
  INVALID_SERVICE_DESCRIPTION: HttpStatus.BAD_REQUEST,
  SERVICE_NOT_FOUND: HttpStatus.NOT_FOUND,
  SERVICE_ORDER_NOT_FOUND: HttpStatus.NOT_FOUND,
  SERVICE_ORDER_ITEMS_REQUIRED: HttpStatus.BAD_REQUEST,
  TENANT_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVALID_SERVICE_ORDER_NOTE: HttpStatus.BAD_REQUEST,
  INVALID_SERVICE_ORDER_ITEM: HttpStatus.BAD_REQUEST,
  INVALID_SERVICE_ORDER_CREATOR: HttpStatus.BAD_REQUEST,
  INVALID_PROTOCOL: HttpStatus.INTERNAL_SERVER_ERROR,
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  INVALID_PUBLIC_ID: HttpStatus.BAD_REQUEST,
  TENANT_DOMAIN_TAKEN: HttpStatus.CONFLICT,
  EMAIL_TAKEN: HttpStatus.CONFLICT,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  INVALID_REFRESH_TOKEN: HttpStatus.UNAUTHORIZED,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
};

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
  };
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'HTTP_500';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof AppError) {
      status = APP_ERROR_STATUS[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = `HTTP_${status}`;
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const body = payload as {
          code?: unknown;
          message?: string | string[];
          details?: unknown;
        };

        if (typeof body.code === 'string') {
          code = body.code;
        }

        if (Array.isArray(body.message)) {
          message = 'Validation failed';
          details = body.message;
        } else if (typeof body.message === 'string') {
          message = body.message;
        }

        if (body.details !== undefined) {
          details = body.details;
        }
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const responseBody: ErrorResponse = {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(responseBody);
  }
}
