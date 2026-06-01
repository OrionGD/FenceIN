import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './vendors.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { TenantGuard } from '../auth/tenant.guard';
import { tenantScope } from '../common/utils/tenant-scope';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @Post()
  create(@Body() createVendorDto: CreateVendorDto, @Req() req: any) {
    const tenantId = tenantScope(req.user).tenantId;
    return this.vendorsService.create(createVendorDto, tenantId);
  }

  @Get()
  findAll(@Req() req: any) {
    const tenantId = tenantScope(req.user).tenantId;
    return this.vendorsService.findAll(tenantId);
  }
}

