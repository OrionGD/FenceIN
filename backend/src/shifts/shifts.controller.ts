import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './shifts.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { tenantScope } from '../common/utils/tenant-scope';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Post()
  create(@Body() dto: CreateShiftDto, @Req() req: any) {
    const tenantId = tenantScope(req.user).tenantId;
    return this.shiftsService.create(dto, tenantId);
  }

  @Get()
  findAll(@Req() req: any) {
    const tenantId = tenantScope(req.user).tenantId;
    return this.shiftsService.findAll(tenantId);
  }
}

