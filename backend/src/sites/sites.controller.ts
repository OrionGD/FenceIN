import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto, AssignWorkerDto } from './sites.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { TenantGuard } from '../auth/tenant.guard';
import { tenantScope } from '../common/utils/tenant-scope';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Post()
  create(@Body() dto: CreateSiteDto, @Req() req: any) {
    const tenantId = tenantScope(req.user).tenantId;
    return this.sitesService.create(dto, tenantId);
  }

  @Get()
  findAll(@Req() req: any) {
    const tenantId = tenantScope(req.user).tenantId;
    return this.sitesService.findAll(tenantId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Post('assign')
  assignWorker(@Body() dto: AssignWorkerDto, @Req() req: any) {
    const user = req.user;
    const tenantId = tenantScope(user).tenantId;
    return this.sitesService.assignWorker(dto, user.id, tenantId);
  }
}

