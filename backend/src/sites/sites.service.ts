import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, AssignWorkerDto } from './sites.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSiteDto) {
    return this.prisma.site.create({
      data: {
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radius: dto.radius ?? 25,
      }
    });
  }

  async findAll() {
    return this.prisma.site.findMany({
      include: { workers: { include: { worker: { select: { firstName: true, lastName: true, role: true } } } } }
    });
  }

  async assignWorker(dto: AssignWorkerDto, assignedBy: string) {
    const exists = await this.prisma.workerSite.findUnique({
      where: { workerId_siteId: { workerId: dto.workerId, siteId: dto.siteId } }
    });
    if (exists) throw new BadRequestException('Worker is already assigned to this site');

    return this.prisma.workerSite.create({
      data: {
        workerId: dto.workerId,
        siteId: dto.siteId,
        assignedBy
      }
    });
  }
}
