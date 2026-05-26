import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    try {
      // 1. Try finding by email directly
      const directUser = await this.prisma.user.findUnique({ where: { email } });
      if (directUser) return directUser;

      // 2. Query users and check if username prefix matches
      const allUsers = await this.prisma.user.findMany();
      const prefixMatch = allUsers.find(
        (u) => u.email.split('@')[0].toLowerCase() === email.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
      );
      return prefixMatch || null;
    } catch {
      return null;
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updateBiometric(id: string, faceEmbedding: any): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { faceEmbedding },
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        password: passwordHash,
        mustChangePassword: false
      }
    });
  }
}
