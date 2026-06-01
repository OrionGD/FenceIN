import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tenantScope } from '../common/utils/tenant-scope';
import { Role } from '@prisma/client';
import { PLATFORM_SCOPE_KEY } from './platform-scope.decorator';

const PLATFORM_ROLES: Role[] = ['PLATFORM_HEAD', 'PLATFORM_ADMIN'];

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPlatformScope = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_SCOPE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (isPlatformScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // Allow unauthenticated requests to continue to authentication guards or public handlers.
      return true;
    }

    if (PLATFORM_ROLES.includes(user.role)) {
      return true;
    }

    const scope = tenantScope(user);
    if (!scope.tenantId) {
      throw new ForbiddenException('Tenant context missing or invalid for this request.');
    }

    request.context = {
      ...request.context,
      tenantId: scope.tenantId,
      userId: user.userId || user.sub,
      role: user.role,
    };

    return true;
  }
}
