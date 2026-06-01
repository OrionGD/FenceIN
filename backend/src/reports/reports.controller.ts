import { Controller, Get, Res, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { tenantScope } from '../common/utils/tenant-scope';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Get('payroll/excel')
  async exportPayrollExcel(@Req() req: any, @Res() res: Response) {
    const tenantId = tenantScope(req.user).tenantId;
    const buffer = await this.reportsService.generatePayrollExcel(tenantId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="payroll_overtime_report.xlsx"',
    });
    res.send(buffer);
  }

  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.HR_ADMIN)
  @Get('compliance/pdf')
  async exportCompliancePdf(@Req() req: any, @Res() res: Response) {
    const tenantId = tenantScope(req.user).tenantId;
    const buffer = await this.reportsService.generateCompliancePdf(tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="compliance_audit_report.pdf"',
    });
    res.send(buffer);
  }
}

