import { HttpStatus } from '@nestjs/common';

export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    ) {
        super(message);
        this.name = 'AppError';
    }
}