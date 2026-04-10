import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '../errors/app.error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx      = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const { status, message } = this.resolveException(exception);

        response.status(status).json({
            success:    false,
            data:       null,
            error:      message,
            statusCode: status,
        });
    }

    private resolveException(exception: unknown): { status: number; message: string } {
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            const message  = typeof response === 'string'
                ? response
                : (response as Record<string, unknown>)['message']?.toString() ?? exception.message;
            return { status: exception.getStatus(), message };
        }

        if (exception instanceof AppError) {
            return { status: exception.statusCode, message: exception.message };
        }

        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
    }
}