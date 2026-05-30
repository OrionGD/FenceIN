import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './shifts.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShiftDto, tenantId?: string) {
    return this.prisma.shift.create({
      data: {
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        gracePeriodMin: dto.gracePeriodMin ?? 15,
        isOvernight: dto.isOvernight ?? false,
        tenantId: tenantId || dto.tenantId || null,
      }
    });
  }

  async findAll(tenantId?: string) {
    return this.prisma.shift.findMany({
      where: {
        OR: [
          { tenantId: null },
          tenantId ? { tenantId } : {},
        ],
      },
    });
  }
}
