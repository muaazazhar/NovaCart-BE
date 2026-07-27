import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';

export interface ResponseShape<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseShape<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseShape<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((payload) => {
        if (payload && typeof payload === 'object' && 'data' in (payload as object) && 'meta' in (payload as object)) {
          const paginated = payload as { data: T; meta: Record<string, unknown>; message?: string };
          return {
            success: true,
            message: paginated.message || 'Success',
            data: paginated.data,
            meta: paginated.meta,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        if (payload && typeof payload === 'object' && 'message' in (payload as object) && 'data' in (payload as object)) {
          const wrapped = payload as { message: string; data: T };
          return {
            success: true,
            message: wrapped.message,
            data: wrapped.data,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        return {
          success: true,
          message: 'Success',
          data: payload as T,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
