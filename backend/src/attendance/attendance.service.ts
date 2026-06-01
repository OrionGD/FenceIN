import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from './attendance.dto';
import { startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { EventsGateway } from '../events/events.gateway';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway
  ) {}

  async checkIn(dto: CheckInDto, requestingTenantId?: string) {
    if (dto.accuracy && dto.accuracy > 50) {
      throw new BadRequestException('GPS accuracy is too low (>50m). Please try again in an open area.');
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const userRecord = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { tenantId: true }
    });
    if (!userRecord) {
      throw new NotFoundException('User not found');
    }
    if (requestingTenantId && userRecord.tenantId !== requestingTenantId) {
      throw new ForbiddenException('Access denied: cross-tenant attendance operation prohibited.');
    }
    const tenantId = userRecord.tenantId || null;

    const existingRecord = await this.prisma.attendance.findFirst({
      where: { userId: dto.userId, tenantId, checkIn: { gte: todayStart, lte: todayEnd } },
    });
    if (existingRecord) throw new BadRequestException('User already checked in today');

    let distance = null;
    let withinFence = false;
    let geofenceStatus = 'NO_GPS';
    let geofenceConfidence = 0.0;

    if (dto.latitude && dto.longitude) {
      const workerSite = await this.prisma.workerSite.findFirst({
        where: { workerId: dto.userId, tenantId },
        include: { site: true }
      });

      if (workerSite && workerSite.site) {
        const site = workerSite.site;
        distance = calculateDistance(site.latitude, site.longitude, dto.latitude, dto.longitude);
        if (distance > site.radius) {
          geofenceConfidence = 0.2;
          
          await this.prisma.incident.create({
            data: {
              userId: dto.userId,
              type: 'GEOFENCE_VIOLATION',
              severity: 'HIGH',
              description: `User tried to check in ${Math.round(distance)}m away from site.`,
              tenantId,
            }
          });

          throw new BadRequestException(`Geofence Violation: You are ${Math.round(distance)}m away from the assigned site (Max: ${site.radius}m).`);
        }
        withinFence = true;
        geofenceStatus = 'VALID';
        geofenceConfidence = 1.0;
      } else {
        // Unassigned workers
        geofenceStatus = 'NO_SITE_ASSIGNED';
        geofenceConfidence = 0.5;
      }
    } else {
       throw new BadRequestException('GPS location is required for check-in.');
    }

    // --- Attendance Confidence Engine ---
    const faceConf = dto.confidence || 0.0;
    const livenessConf = dto.livenessScore !== undefined ? dto.livenessScore : 1.0; 
    const deviceConf = dto.deviceTrustScore !== undefined ? dto.deviceTrustScore : 1.0;
    
    // Weighted trust score
    const finalTrustScore = (faceConf * 0.4) + (livenessConf * 0.3) + (geofenceConfidence * 0.2) + (deviceConf * 0.1);

    if (livenessConf < 0.5) {
      await this.prisma.incident.create({
         data: {
           userId: dto.userId,
           type: 'SPOOF_ATTEMPT',
           severity: 'CRITICAL',
           description: `Failed liveness check. Score: ${livenessConf}`,
           tenantId,
         }
      });
      throw new BadRequestException('Liveness check failed. Spoofing detected.');
    }

    const record = await this.prisma.attendance.create({
      data: {
        userId: dto.userId,
        checkIn: new Date(),
        confidence: dto.confidence,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        distance,
        withinFence,
        geofenceStatus,
        livenessScore: dto.livenessScore,
        deviceTrustScore: dto.deviceTrustScore,
        finalTrustScore: finalTrustScore,
        deviceId: dto.deviceId,
        kioskId: dto.kioskId,
        tenantId,
      },
      include: { user: { select: { firstName: true, lastName: true, userRole: true } } },
    });

    this.eventsGateway.emitAttendanceEvent({ type: 'CHECK_IN', data: record }, tenantId);
    return record;
  }

  async checkOut(userId: string, requestingTenantId?: string) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const record = await this.prisma.attendance.findFirst({
      where: {
        userId: userId,
        ...(requestingTenantId ? { tenantId: requestingTenantId } : {}),
        checkIn: { gte: todayStart, lte: todayEnd },
        checkOut: null,
      },
    });

    if (!record) {
      throw new NotFoundException('No active check-in found for today');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (requestingTenantId && user.tenantId !== requestingTenantId) {
      throw new ForbiddenException('Access denied: cross-tenant attendance operation prohibited.');
    }
    const tenantId = user.tenantId || null;

    // Shift length calculation for UI/Reporting (Overtime logic)
    // We update the checkout time
    const updatedRecord = await this.prisma.attendance.updateMany({
      where: { id: record.id, tenantId },
      data: { checkOut: new Date() },
    });

    if (updatedRecord.count !== 1) {
      throw new ForbiddenException('Unable to update attendance record due to tenant mismatch or record mismatch.');
    }

    const result = await this.prisma.attendance.findUnique({
      where: { id: record.id },
      include: { user: { select: { firstName: true, lastName: true, userRole: true } } },
    });

    if (!result) {
      throw new NotFoundException('Attendance record not found after update.');
    }


    this.eventsGateway.emitAttendanceEvent({ type: 'CHECK_OUT', data: updatedRecord }, tenantId);
    return updatedRecord;
  }

  async getTodayLogs(tenantId?: string) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const whereClause: any = { checkIn: { gte: todayStart, lte: todayEnd } };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const records = await this.prisma.attendance.findMany({
      where: whereClause,
      include: { user: { select: { firstName: true, lastName: true, userRole: true } } },
      orderBy: { checkIn: 'desc' },
    });

    return records.map(record => {
      let durationMinutes = 0;
      if (record.checkOut) {
        durationMinutes = differenceInMinutes(record.checkOut, record.checkIn);
      } else {
        durationMinutes = differenceInMinutes(new Date(), record.checkIn); // current duration
      }
      
      const standardShiftMinutes = 8 * 60;
      const overtimeMinutes = Math.max(0, durationMinutes - standardShiftMinutes);

      return {
        ...record,
        durationMinutes,
        overtimeMinutes,
        status: record.checkOut ? 'COMPLETED' : 'ACTIVE',
      };
    });
  }

  async generateExcelReport(tenantId?: string) {
    const exceljs = require('exceljs');
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Worker Name', key: 'name', width: 30 },
      { header: 'Check In', key: 'checkIn', width: 20 },
      { header: 'Check Out', key: 'checkOut', width: 20 },
    ];

    const logs = await this.getTodayLogs(tenantId);
    logs.forEach(log => {
      worksheet.addRow({
        id: log.id,
        name: `${(log as any).user.firstName} ${(log as any).user.lastName}`,
        checkIn: log.checkIn.toISOString(),
        checkOut: log.checkOut ? log.checkOut.toISOString() : 'Active',
      });
    });

    return await workbook.xlsx.writeBuffer();
  }
}
