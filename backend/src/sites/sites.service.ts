import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, AssignWorkerDto } from './sites.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSiteDto, tenantId?: string) {
    return this.prisma.site.create({
      data: {
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radius: dto.radius ?? 25,
        tenantId,
      }
    });
  }

  async findAll(tenantId?: string) {
    const whereClause = tenantId ? { tenantId } : {};
    return this.prisma.site.findMany({
      where: whereClause,
      include: { workers: { include: { worker: { select: { firstName: true, lastName: true, userRole: true } } } } }
    });
  }

  async assignWorker(dto: AssignWorkerDto, assignedBy: string, tenantId?: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId }
    });
    if (!site) throw new BadRequestException('Site not found');
    if (tenantId && site.tenantId !== tenantId) {
      throw new BadRequestException('Unauthorized access to site');
    }

    const worker = await this.prisma.user.findUnique({
      where: { id: dto.workerId }
    });
    if (!worker) throw new BadRequestException('Worker not found');
    if (tenantId && worker.tenantId !== tenantId) {
      throw new BadRequestException('Unauthorized access to worker');
    }

    const exists = await this.prisma.workerSite.findUnique({
      where: { workerId_siteId: { workerId: dto.workerId, siteId: dto.siteId } }
    });
    if (exists) throw new BadRequestException('Worker is already assigned to this site');

    return this.prisma.workerSite.create({
      data: {
        workerId: dto.workerId,
        siteId: dto.siteId,
        assignedBy,
        tenantId,
      }
    });
  }
}
