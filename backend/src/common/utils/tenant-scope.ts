import { ForbiddenException } from '@nestjs/common';

export function tenantScope(reqOrUserOrContext: any) {
  if (!reqOrUserOrContext) {
    throw new ForbiddenException('Authentication context missing');
  }

  // Support extracting from req.context (hydrated by TenantContextInterceptor),
  // req.user (Passport standard), req.authContext, or direct user/context object passed.
  const tenantId =
    reqOrUserOrContext.context?.tenantId ||
    reqOrUserOrContext.user?.tenantId ||
    reqOrUserOrContext.authContext?.tenantId ||
    reqOrUserOrContext.tenantId ||
    reqOrUserOrContext.organizationId;

  const role =
    reqOrUserOrContext.context?.role ||
    reqOrUserOrContext.user?.role ||
    reqOrUserOrContext.authContext?.role ||
    reqOrUserOrContext.role ||
    reqOrUserOrContext.userRole;

  const isPlatform =
    role === 'PLATFORM_HEAD' ||
    role === 'PLATFORM_ADMIN';

  if (isPlatform) {
    return {};
  }

  if (!tenantId) {
    throw new ForbiddenException('Organization access missing tenantId');
  }

  return {
    tenantId,
  };
}
