import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './vendors.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @Post()
  create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorsService.create(createVendorDto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.VENDOR_MANAGER)
  @Get()
  findAll() {
    return this.vendorsService.findAll();
  }
}
