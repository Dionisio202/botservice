import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { SKIP_TRANSFORM } from '../decorators/skip-transform.decorator';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T> {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
        const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (skip) return next.handle();

        return next.handle().pipe(
            map((data) => ({
                success:    true,
                data:       data ?? null,
                error:      null,
                statusCode: context.switchToHttp().getResponse().statusCode,
            })),
        );
    }
}