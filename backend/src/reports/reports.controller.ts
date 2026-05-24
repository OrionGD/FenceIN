import { Controller, Get, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('payroll/excel')
  async exportPayrollExcel(@Res() res: Response) {
    const buffer = await this.reportsService.generatePayrollExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="payroll_overtime_report.xlsx"',
    });
    res.send(buffer);
  }

  @Get('compliance/pdf')
  async exportCompliancePdf(@Res() res: Response) {
    const buffer = await this.reportsService.generateCompliancePdf();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="compliance_audit_report.pdf"',
    });
    res.send(buffer);
  }
}
