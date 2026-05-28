import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerDto } from './workers.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class WorkersService {
  constructor(private prisma: PrismaService) {}

  async create(createWorkerDto: any) {
    const { tenantId, organizationId, role, ...rest } = createWorkerDto;
    const hashedPassword = await bcrypt.hash(createWorkerDto.password, 10);
    
    const userRoleStr = role || 'WORKER';
    const ROLE_TO_LEVEL: Record<string, number> = {
      ORGANIZATION: 0,
      SUPER_ADMIN: 1,
      ORG_ADMIN: 2,
      HR_ADMIN: 2,
      SUPERVISOR: 3,
      SECURITY_OFFICER: 4,
      VENDOR_MANAGER: 5,
      VENDOR: 5,
      WORKER: 6,
    };
    const roleLevelNum = ROLE_TO_LEVEL[userRoleStr] ?? 6;
    const customUserId = `USR_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    
    const resolvedTenantId = tenantId || organizationId || 'ORG001';
    let resolvedTenantName = 'SHIELD';
    if (resolvedTenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: resolvedTenantId },
        select: { name: true }
      });
      if (tenant) {
        resolvedTenantName = tenant.name;
      }
    }

    const created = await this.prisma.user.create({
      data: {
        ...rest,
        password: hashedPassword,
        userRole: userRoleStr,
        roleLevel: roleLevelNum,
        user_id: customUserId,
        tenantId: resolvedTenantId,
        tenantName: resolvedTenantName,
        state: 'ACTIVE',
      },
      select: { id: true, email: true, firstName: true, lastName: true, userRole: true, tenantId: true, user_id: true, roleLevel: true },
    });

    return {
      ...created,
      role: created.userRole,
    };
  }

  async findAll(role?: string, tenantId?: string) {
    const whereClause: any = {};
    if (role) {
      whereClause.userRole = role;
    }
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: { id: true, email: true, firstName: true, lastName: true, userRole: true, isActive: true, createdAt: true, tenantId: true, user_id: true, roleLevel: true },
    });
    return users.map(u => ({
      ...u,
      role: u.userRole,
    }));
  }

  async remove(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false }, // Soft delete
    });
  }
}
