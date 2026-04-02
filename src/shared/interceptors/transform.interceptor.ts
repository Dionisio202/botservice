import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T> {
    intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
        return next.handle().pipe(
            map((data) => ({
                success:    true,
                data:       data ?? null,
                error:      null,
                statusCode: _context.switchToHttp().getResponse().statusCode,
            })),
        );
    }
}