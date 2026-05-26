import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, WorkerState } from '@prisma/client';

@Controller('worker-requests')
export class WorkerRequestsController {
  constructor(private prisma: PrismaService) {}

  @Post('register')
  async register(@Body() dto: any) {
    const {
      firstName,
      lastName,
      phone,
      emergencyContact,
      govId,
      vendorId,
      skillType,
      shiftId,
      siteId,
      address,
      bloodGroup
    } = dto;

    // 1. Resolve Vendor
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found.');
    }

    // 2. Generate Predefined Corporate Email Format
    const cleanVendorName = vendor.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${cleanVendorName}.fencein.app`;
    
    // Deduplicate email if collision occurs
    let finalEmail = baseEmail;
    let collisionCheck = await this.prisma.user.findUnique({ where: { email: finalEmail } });
    let counter = 1;
    while (collisionCheck) {
      finalEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${counter}@${cleanVendorName}.fencein.app`;
      collisionCheck = await this.prisma.user.findUnique({ where: { email: finalEmail } });
      counter++;
    }

    // 3. Assign Constant Temporary Password & Hash it
    const tempPassword = 'Temp@FenceIn2026';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 4. Save newly registered worker in database
    const newWorker = await this.prisma.user.create({
      data: {
        email: finalEmail,
        password: hashedPassword,
        firstName,
        lastName,
        role: Role.WORKER,
        state: WorkerState.INVITED, // Pending Face Enrollment
        mustChangePassword: true,   // Required to change password upon first login
        vendorId,
        phone,
        govId,
        bloodGroup,
        address,
        skillType,
        shiftId,
      }
    });

    // 5. Generate Dynamic QR Code URL for Onboarding
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${newWorker.id}`;

    return {
      success: true,
      data: {
        workerRequestId: newWorker.id,
        qrCodeUrl,
        email: finalEmail,
        tempPassword
      }
    };
  }

  @Get('pending')
  async getPending() {
    // Note: faceEmbedding is an Unsupported vector type — cannot use in where clause
    const pendingWorkers = await this.prisma.user.findMany({
      where: {
        role: Role.WORKER,
        state: WorkerState.INVITED,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        bloodGroup: true,
        govId: true,
        address: true,
        email: true,
        role: true,
        state: true
      }
    });

    return {
      success: true,
      data: pendingWorkers
    };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const worker = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.WORKER
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        bloodGroup: true,
        govId: true,
        address: true,
        email: true,
        role: true,
        state: true
      }
    });

    if (!worker) {
      throw new NotFoundException('Worker request not found.');
    }

    return {
      success: true,
      data: worker
    };
  }
}
