import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Skip transformation if we're dealing with a StreamableFile or Buffer (for downloads)
        if (data && (data.constructor?.name === 'StreamableFile' || Buffer.isBuffer(data))) {
          return data;
        }

        // If the data is already in ApiResponse format, return it
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }
        
        return {
          success: true,
          data: data?.data || data,
          meta: data?.meta || undefined,
          message: data?.message || 'Request successful',
        };
      }),
    );
  }
}
