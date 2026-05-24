import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './workers.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN, Role.SUPERVISOR)
  @Post()
  create(@Body() createWorkerDto: CreateWorkerDto) {
    return this.workersService.create(createWorkerDto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN, Role.SUPERVISOR)
  @Get()
  findAll() {
    return this.workersService.findAll();
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workersService.remove(id);
  }
}
