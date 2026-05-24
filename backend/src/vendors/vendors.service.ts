import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './vendors.dto';
import { Role } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto) {
    const manager = await this.prisma.user.findUnique({
      where: { id: createVendorDto.managerId }
    });

    if (!manager || manager.role !== Role.VENDOR_MANAGER) {
      throw new NotFoundException('Invalid vendor manager ID');
    }

    return this.prisma.vendor.create({
      data: createVendorDto,
      include: { manager: true },
    });
  }

  async findAll() {
    return this.prisma.vendor.findMany({
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }
}
