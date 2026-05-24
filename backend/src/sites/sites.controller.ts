import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto, AssignWorkerDto } from './sites.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Post()
  create(@Body() dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }

  @Get()
  findAll() {
    return this.sitesService.findAll();
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Post('assign')
  assignWorker(@Body() dto: AssignWorkerDto, @Req() req: any) {
    return this.sitesService.assignWorker(dto, req.user.id);
  }
}
