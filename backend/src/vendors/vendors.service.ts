import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './vendors.dto';
import { Role } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto, tenantId?: string) {
    const manager = await this.prisma.user.findUnique({
      where: { id: createVendorDto.managerId }
    });

    if (!manager || manager.userRole !== 'VENDOR_MANAGER') {
      throw new NotFoundException('Invalid vendor manager ID');
    }

    if (tenantId && manager.tenantId !== tenantId) {
      throw new NotFoundException('Vendor manager does not belong to the tenant context');
    }

    return this.prisma.vendor.create({
      data: {
        ...createVendorDto,
        tenantId,
      },
      include: { manager: true },
    });
  }

  async findAll(tenantId?: string) {
    const whereClause = tenantId ? { tenantId } : {};
    return this.prisma.vendor.findMany({
      where: whereClause,
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }
}
