import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerDto } from './workers.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class WorkersService {
  constructor(private prisma: PrismaService) {}

  async create(createWorkerDto: CreateWorkerDto) {
    const hashedPassword = await bcrypt.hash(createWorkerDto.password, 10);
    return this.prisma.user.create({
      data: {
        ...createWorkerDto,
        password: hashedPassword,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { role: 'WORKER' },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
    });
  }

  async remove(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false }, // Soft delete
    });
  }
}
