import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { differenceInMinutes } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generatePayrollExcel(): Promise<Buffer> {
    const records = await this.prisma.attendance.findMany({
      include: { user: true },
      orderBy: { checkIn: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll & Overtime');

    worksheet.columns = [
      { header: 'Worker Name', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Check In', key: 'checkIn', width: 25 },
      { header: 'Check Out', key: 'checkOut', width: 25 },
      { header: 'Total Minutes', key: 'totalMin', width: 15 },
      { header: 'Overtime Minutes', key: 'otMin', width: 20 },
    ];

    records.forEach(record => {
      let duration = 0;
      if (record.checkOut) {
        duration = differenceInMinutes(record.checkOut, record.checkIn);
      }
      const standardShift = 8 * 60;
      const overtime = Math.max(0, duration - standardShift);

      worksheet.addRow({
        name: `${record.user.firstName} ${record.user.lastName}`,
        role: record.user.role,
        checkIn: record.checkIn.toLocaleString(),
        checkOut: record.checkOut ? record.checkOut.toLocaleString() : 'Active',
        totalMin: duration,
        otMin: overtime,
      });
    });

    return (await workbook.xlsx.writeBuffer()) as any;
  }

  async generateCompliancePdf(): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        doc.fontSize(20).text('Enterprise Compliance & Audit Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated On: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown(2);

        // 1. Geofence Violations
        const violations = await this.prisma.attendance.findMany({
          where: { geofenceStatus: 'VIOLATION' },
          include: { user: true },
          take: 50,
          orderBy: { checkIn: 'desc' }
        });

        doc.fontSize(16).text('Recent Geofence Violations (Top 50)', { underline: true });
        doc.moveDown(0.5);
        if (violations.length === 0) {
          doc.fontSize(12).fillColor('green').text('No recent geofence violations found.');
        } else {
          violations.forEach(v => {
            doc.fontSize(10).fillColor('black').text(`- ${v.user.firstName} ${v.user.lastName} | ID: ${v.id} | Distance: ${Math.round(v.distance || 0)}m | Time: ${v.checkIn.toLocaleString()}`);
          });
        }
        
        doc.moveDown(2);

        // 2. Offline Queued Synced Audits
        const offlineSyncs = await this.prisma.attendance.findMany({
          where: { confidence: 0.99 }, // Our offline queue mock uses 0.99
          include: { user: true },
          take: 50
        });

        doc.fontSize(16).fillColor('black').text('Offline Queue Sync Audits', { underline: true });
        doc.moveDown(0.5);
        if (offlineSyncs.length === 0) {
          doc.fontSize(12).text('No offline synced records found.');
        } else {
          offlineSyncs.forEach(o => {
            const name = o.user ? `${o.user.firstName} ${o.user.lastName}` : o.userId;
            doc.fontSize(10).text(`- Worker: ${name} | Reconciled At: ${o.createdAt.toLocaleString()}`);
          });
        }

        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }
}
