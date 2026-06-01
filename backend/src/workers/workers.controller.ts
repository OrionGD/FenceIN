import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './workers.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { tenantScope } from '../common/utils/tenant-scope';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN, Role.SUPERVISOR)
  @Post()
  create(@Body() createWorkerDto: CreateWorkerDto, @Req() req: any) {
    const scope = tenantScope(req.user);
    const tenantId = scope.tenantId || createWorkerDto.tenantId || createWorkerDto.organizationId;
    return this.workersService.create({
      ...createWorkerDto,
      tenantId,
    });
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN, Role.SUPERVISOR)
  @Get()
  findAll(@Req() req: any, @Query('role') role?: string) {
    const tenantId = tenantScope(req.user).tenantId;
    return this.workersService.findAll(role, tenantId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = tenantScope(req.user).tenantId;
    return this.workersService.remove(id, tenantId);
  }
}

