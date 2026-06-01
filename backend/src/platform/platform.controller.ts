import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { PlatformScope } from '../auth/platform-scope.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Controller('platform')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@PlatformScope()
@Roles(Role.PLATFORM_HEAD, Role.PLATFORM_ADMIN)
export class PlatformController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    return this.analyticsService.getDashboard(undefined);
  }

  @Get('analytics')
  async getAnalytics() {
    return this.authService.getPlatformAnalytics();
  }

  @Get('organizations')
  async getOrganizations() {
    return this.authService.getAccessRequests();
  }

  @Post('review-request')
  async reviewRequest(@Request() req: any, @Body() body: { requestId: string; status: string; notes?: string }) {
    return this.authService.reviewAccessRequest(body.requestId, body.status, body.notes, req.user.userId);
  }

  @Post('provision-tenant')
  async provisionTenant(@Request() req: any, @Body() body: { requestId: string; plan?: string }) {
    return this.authService.provisionTenant(body.requestId, body.plan || 'STANDARD', req.user.userId);
  }

  @Get('workers')
  async getWorkers() {
    return this.prisma.user.findMany({
      where: { userRole: Role.WORKER },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userRole: true,
        isActive: true,
        tenantId: true,
        state: true,
        createdAt: true,
      },
    });
  }

  @Get('vendors')
  async getVendors() {
    return this.prisma.vendor.findMany({
      include: {
        tenant: { select: { name: true } },
        manager: { select: { email: true, firstName: true, lastName: true } },
      },
    });
  }

  @Get('security')
  async getSecurity() {
    return this.prisma.incident.findMany({
      include: {
        tenant: { select: { name: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
