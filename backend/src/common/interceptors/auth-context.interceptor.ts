import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    if (req.user) {
      req.authContext = {
        userId: req.user.userId || req.user.sub,
        tenantId: req.user.tenantId,
        role: req.user.role,
      };
    }

    return next.handle();
  }
}
