import { Controller, Post, Body, Get, UseGuards, Param, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(Role.SUPER_ADMIN, Role.SECURITY_OFFICER, Role.SUPERVISOR)
  @Post('check-in')
  checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.SECURITY_OFFICER, Role.SUPERVISOR)
  @Put('check-out/:userId')
  checkOut(@Param('userId') userId: string) {
    return this.attendanceService.checkOut(userId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN, Role.SUPERVISOR, Role.SECURITY_OFFICER)
  @Get('today')
  getTodayLogs() {
    return this.attendanceService.getTodayLogs();
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Get('export')
  async exportExcel(@Res({ passthrough: true }) res: Response) {
    const buffer = await this.attendanceService.generateExcelReport();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="attendance-report.xlsx"',
    });
    const { StreamableFile } = await import('@nestjs/common');
    return new StreamableFile(buffer as unknown as Uint8Array);
  }
}
