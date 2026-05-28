import { Injectable } from '@nestjs/common';
import { MongoService } from '../mongo/mongo.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private mongo: MongoService,
    private prisma: PrismaService,
  ) {}

  /** Returns daily analytics snapshots from MongoDB (last N days) */
  async getDailySnapshots(tenantId?: string, days = 30) {
    return this.mongo.getSnapshots(tenantId || null, 'daily', days);
  }

  /** Returns the latest daily snapshot — quick dashboard summary */
  async getLatestDailySnapshot(tenantId?: string) {
    return this.mongo.getLatestSnapshot(tenantId || null, 'daily');
  }

  /** Returns recent AI inference logs (biometric match results) from MongoDB */
  async getInferenceLogs(filter: { tenantId?: string; method?: string; outcome?: string; userId?: string | string[]; limit?: number }) {
    return this.mongo.getInferenceLogs(filter);
  }

  /** Returns audit log history from MongoDB */
  async getAuditLogs(tenantId?: string, userId?: string | string[], limit = 50) {
    return this.mongo.getAuditLogs(tenantId || null, userId, limit);
  }

  /** Returns AI chat history from MongoDB */
  async getAiChatHistory(tenantId?: string, userId?: string | string[], limit = 20) {
    return this.mongo.getAiChatHistory(tenantId || null, userId, limit);
  }

  /**
   * Full system dashboard: combines live PostgreSQL counts
   * with MongoDB analytics and inference telemetry.
   */
  async getDashboard(tenantId?: string) {
    const today = new Date().toISOString().slice(0, 10);

    // Live counts from PostgreSQL (source of truth for identity data)
    const [totalUsers, totalWorkers, activeUsers, checkInsToday] = await Promise.all([
      this.prisma.user.count({ where: tenantId ? { tenantId } : {} }),
      this.prisma.user.count({ where: { userRole: 'WORKER', ...(tenantId ? { tenantId } : {}) } }),
      this.prisma.user.count({ where: { isActive: true, ...(tenantId ? { tenantId } : {}) } }),
      this.prisma.attendance.count({
        where: { 
          checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          ...(tenantId ? { tenantId } : {})
        },
      }),
    ]);

    // Fetch all user IDs in the organization if scoping is active
    const userIds = tenantId
      ? (await this.prisma.user.findMany({ where: { tenantId }, select: { id: true } })).map(u => u.id)
      : undefined;

    // Analytics & AI data from MongoDB
    const [todaySnapshot, recentInferences, recentAuditLogs] = await Promise.all([
      this.mongo.getLatestSnapshot(tenantId || null, 'daily'),
      this.mongo.getInferenceLogs({ tenantId, userId: userIds, limit: 10 }),
      this.mongo.getAuditLogs(tenantId || null, userIds, 20),
    ]);

    return {
      live: {
        totalUsers,
        totalWorkers,
        activeUsers,
        checkInsToday,
        date: today,
      },
      analytics: todaySnapshot ?? {
        period: 'daily',
        bucket: today,
        totalCheckIns: 0,
        faceAuthAttempts: 0,
        faceAuthSuccesses: 0,
        fingerprintAuthAttempts: 0,
        fingerprintAuthSuccesses: 0,
        livenessFailures: 0,
        spoofAttempts: 0,
      },
      recentInferences,
      recentAuditLogs,
    };
  }

  async getInferenceLogsScoped(user: any, filter: { method?: string; outcome?: string; userId?: string; limit?: number }) {
    let targetUserId: string | string[] | undefined = filter.userId;
    const tenantId = user.role === 'SUPER_ADMIN' ? undefined : user.tenantId;
    if (user.role !== 'SUPER_ADMIN') {
      const orgUsers = await this.prisma.user.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true }
      });
      const orgUserIds = orgUsers.map(u => u.id);
      if (filter.userId) {
        if (!orgUserIds.includes(filter.userId)) return [];
      } else {
        targetUserId = orgUserIds;
      }
    }
    return this.getInferenceLogs({ ...filter, tenantId, userId: targetUserId });
  }

  async getAuditLogsScoped(user: any, userId?: string, limit = 50) {
    let targetUserId: string | string[] | undefined = userId;
    const tenantId = user.role === 'SUPER_ADMIN' ? undefined : user.tenantId;
    if (user.role !== 'SUPER_ADMIN') {
      const orgUsers = await this.prisma.user.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true }
      });
      const orgUserIds = orgUsers.map(u => u.id);
      if (userId) {
        if (!orgUserIds.includes(userId)) return [];
      } else {
        targetUserId = orgUserIds;
      }
    }
    return this.getAuditLogs(tenantId, targetUserId, limit);
  }

  async getAiChatHistoryScoped(user: any, userId?: string, limit = 20) {
    let targetUserId: string | string[] | undefined = userId;
    const tenantId = user.role === 'SUPER_ADMIN' ? undefined : user.tenantId;
    if (user.role !== 'SUPER_ADMIN') {
      const orgUsers = await this.prisma.user.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true }
      });
      const orgUserIds = orgUsers.map(u => u.id);
      if (userId) {
        if (!orgUserIds.includes(userId)) return [];
      } else {
        targetUserId = orgUserIds;
      }
    }
    return this.getAiChatHistory(tenantId, targetUserId as any, limit);
  }
}
