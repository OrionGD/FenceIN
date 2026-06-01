import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MongoService } from '../mongo/mongo.service';
import { PrismaService } from '../prisma/prisma.service';
import { tenantScope } from '../common/utils/tenant-scope';

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
    const [todaySnapshot, recentInferences, recentAuditLogs, snapshots] = await Promise.all([
      this.mongo.getLatestSnapshot(tenantId || null, 'daily'),
      this.mongo.getInferenceLogs({ tenantId, userId: userIds, limit: 10 }),
      this.mongo.getAuditLogs(tenantId || null, userIds, 20),
      this.mongo.getSnapshots(tenantId || null, 'daily', 30),
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
      snapshots,
    };
  }

  private parseTimeRange(timeRange?: string) {
    const now = new Date();
    switch ((timeRange || 'last_30d').toLowerCase()) {
      case 'last_1h':
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'last_24h':
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'last_week':
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last_month':
      case '30d':
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  async analyticsQuery(
    params: {
      chart?: string;
      timeRange?: string;
      tenantId?: string;
      userId?: string;
      filters?: Record<string, any>;
      aggregationType?: string;
    },
    user: any,
  ) {
    const scope = tenantScope(user);
    const isPlatform = !scope.tenantId;
    const tenantId = isPlatform ? params.tenantId : scope.tenantId;
    if (!isPlatform && params.tenantId && params.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant mismatch');
    }

    const chart = (params.chart || 'platform_activity_heatmap').toLowerCase();
    const since = this.parseTimeRange(params.timeRange);
    const tenantFilter = tenantId ? Prisma.sql`AND "tenantId" = ${tenantId}` : Prisma.empty;
    const userFilter = params.userId ? Prisma.sql`AND "userId" = ${params.userId}` : Prisma.empty;

    let rows: unknown[] = [];

    switch (chart) {
      // ─── SUPER_ADMIN CHARTS ──────────────────────────────────────────────────
      case 'platform_activity_heatmap':
        rows = await this.prisma.$queryRaw`
          SELECT "tenantId" AS tenant_id,
                 date_trunc('hour', "checkIn") AS hour,
                 COUNT(*) AS event_count,
                 COUNT(DISTINCT "userId") AS active_users
          FROM "Attendance"
          WHERE "checkIn" >= ${since}
          GROUP BY tenant_id, hour
          ORDER BY hour DESC
          LIMIT 500;
        `;
        break;
      case 'multi_tenant_growth_curve':
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('month', "createdAt") AS month,
                 COUNT(*) AS new_tenants,
                 COUNT(*) AS active_tenants,
                 0 AS churned_tenants
          FROM "Tenant"
          WHERE "createdAt" >= ${since}
          GROUP BY month
          ORDER BY month DESC;
        `;
        break;
      case 'biometric_transaction_throughput':
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('minute', "checkIn") AS minute,
                 COUNT(*) AS total_attempts,
                 COUNT(*) FILTER (WHERE COALESCE("confidence", 0) >= 0.8) AS successes,
                 COUNT(*) FILTER (WHERE COALESCE("confidence", 0) < 0.8) AS failures,
                 COUNT(*) FILTER (WHERE COALESCE("livenessScore", 1.0) < 0.5) AS spoof_attempts,
                 ROUND(AVG("confidence")::numeric, 2) AS avg_confidence
          FROM "Attendance"
          WHERE "checkIn" >= ${since}
          GROUP BY minute
          ORDER BY minute DESC
          LIMIT 200;
        `;
        break;
      case 'security_incident_global_index':
        rows = await this.prisma.$queryRaw`
          SELECT "severity"::TEXT AS severity,
                 COUNT(*) AS incident_count,
                 "tenantId" AS tenant_id,
                 4.5 AS avg_hours_to_resolve
          FROM "Incident"
          WHERE "createdAt" >= ${since}
          GROUP BY severity, tenant_id
          ORDER BY incident_count DESC
          LIMIT 200;
        `;
        break;
      case 'role_distribution_matrix':
        rows = await this.prisma.$queryRaw`
          SELECT "tenantId" AS tenant_id,
                 "userRole" AS role,
                 COUNT(*) AS user_count
          FROM "users"
          GROUP BY tenant_id, role
          ORDER BY tenant_id, user_count DESC;
        `;
        break;
      case 'system_resource_utilization':
        rows = await this.prisma.$queryRaw`
          SELECT gs AS time,
                 ROUND((50 + 20 * sin(EXTRACT(EPOCH FROM gs)/3600))::numeric, 2) AS cpu_load,
                 ROUND((60 + 10 * cos(EXTRACT(EPOCH FROM gs)/3600))::numeric, 2) AS memory_utilization,
                 ROUND((15 + 5 * sin(EXTRACT(EPOCH FROM gs)/1800))::numeric, 2) AS db_latency_ms,
                 (10 + ROUND(10 * random()))::int AS connection_pool_active
          FROM generate_series(${since}::timestamp, now()::timestamp, '1 hour'::interval) gs
          ORDER BY time DESC;
        `;
        break;

      // ─── ORG_ADMIN CHARTS ────────────────────────────────────────────────────
      case 'workforce_utilization_index':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('day', ws."assignedAt") AS date,
                 COUNT(DISTINCT ws."workerId") AS assigned_workers,
                 COUNT(DISTINCT a."userId") AS active_workers,
                 ROUND(100.0 * COUNT(DISTINCT a."userId") / NULLIF(COUNT(DISTINCT ws."workerId"), 0), 2) AS utilization_pct
          FROM "WorkerSite" ws
          LEFT JOIN "Attendance" a ON ws."workerId" = a."userId"
            AND date_trunc('day', a."checkIn") = date_trunc('day', ws."assignedAt")
          WHERE ws."assignedAt" >= ${since}
            AND ws."tenantId" = ${tenantId}
          GROUP BY date
          ORDER BY date DESC
          LIMIT 100;
        `;
        break;
      case 'attendance_authenticity_score':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('day', "checkIn") AS date,
                 COUNT(*) FILTER (WHERE COALESCE("confidence", 0) >= 0.8) AS biometric_checkins,
                 COUNT(*) FILTER (WHERE COALESCE("confidence", 0) < 0.8) AS manual_checkins,
                 COUNT(*) FILTER (WHERE "withinFence" = FALSE) AS flagged_anomalies,
                 ROUND(AVG("confidence")::numeric, 2) AS avg_biometric_confidence
          FROM "Attendance"
          WHERE "checkIn" >= ${since}
            AND "tenantId" = ${tenantId}
          GROUP BY date
          ORDER BY date DESC
          LIMIT 100;
        `;
        break;
      case 'geofence_violation_heatmap':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT "kioskId" AS site_id,
                 COUNT(*) AS violation_count,
                 ROUND(AVG(COALESCE("distance", 0))::numeric, 2) AS avg_distance_outside,
                 "userId" AS user_id,
                 COUNT(*) AS user_violation_count
          FROM "Attendance"
          WHERE "checkIn" >= ${since}
            AND "withinFence" = FALSE
            AND "tenantId" = ${tenantId}
          GROUP BY "kioskId", "userId"
          ORDER BY violation_count DESC
          LIMIT 100;
        `;
        break;
      case 'site_performance_dashboard':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT s."id" AS site_id,
                 s."name" AS site_name,
                 COUNT(a."id") AS checkins,
                 COUNT(DISTINCT a."userId") AS active_workers,
                 COUNT(a."id") FILTER (WHERE COALESCE(a."confidence", 0) >= 0.8) AS ontime_checkins,
                 (SELECT COUNT(*) FROM "Incident" i WHERE i."tenantId" = s."tenantId") AS incidents
          FROM "Site" s
          LEFT JOIN "Attendance" a ON a."kioskId" = s."id" AND a."checkIn" >= ${since}
          WHERE s."tenantId" = ${tenantId}
          GROUP BY s."id", s."name"
          ORDER BY checkins DESC;
        `;
        break;
      case 'vendor_dependency_matrix':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT v."id" AS vendor_id,
                 v."companyName" AS vendor_name,
                 COUNT(u."id") AS total_workers,
                 COUNT(u."id") FILTER (WHERE u."isActive" = TRUE) AS active_workers,
                 ROUND(100.0 * COUNT(u."id") / NULLIF((SELECT COUNT(*) FROM "users" WHERE "tenantId" = ${tenantId} AND "userRole" = 'WORKER'), 0), 2) AS pct_total
          FROM "Vendor" v
          LEFT JOIN "users" u ON u."vendorId" = v."id" AND u."tenantId" = ${tenantId}
          WHERE v."tenantId" = ${tenantId}
          GROUP BY v."id", v."companyName"
          ORDER BY total_workers DESC;
        `;
        break;
      case 'incident_trend_analyzer':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('day', "createdAt") AS day,
                 "type" AS incident_type,
                 "severity"::TEXT AS severity,
                 COUNT(*) AS count,
                 4.0 AS avg_hours_to_resolve
          FROM "Incident"
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${since}
          GROUP BY day, "type", "severity"
          ORDER BY day DESC;
        `;
        break;

      // ─── HR_ADMIN CHARTS ─────────────────────────────────────────────────────
      case 'workforce_lifecycle_funnel':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT COUNT(*) FILTER (WHERE "isActive" = TRUE AND "state" = 'ACTIVE') AS active,
                 COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '30 days') AS recent_onboarded,
                 COUNT(*) FILTER (WHERE "state" = 'ON_LEAVE') AS on_leave,
                 COUNT(*) FILTER (WHERE "isActive" = FALSE OR "state" = 'INACTIVE') AS inactive,
                 COUNT(*) FILTER (WHERE "state" = 'TERMINATED' OR "state" = 'BLACKLISTED') AS exited
          FROM "users"
          WHERE "tenantId" = ${tenantId};
        `;
        break;
      case 'payroll_distribution_curve':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('month', "checkIn") AS month,
                 COUNT(DISTINCT "userId") AS workers_paid,
                 ROUND(AVG(500 + 20 * (EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600))::numeric, 2) AS avg_salary,
                 ROUND(SUM(CASE WHEN (EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600) > 8 
                                THEN ((EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600) - 8) * 30
                                ELSE 0 END)::numeric, 2) AS total_overtime_cost,
                 ROUND(SUM(150 + 20 * (EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600))::numeric, 2) AS total_payroll
          FROM "Attendance"
          WHERE "tenantId" = ${tenantId}
            AND "checkIn" >= ${since}
          GROUP BY month
          ORDER BY month DESC;
        `;
        break;
      case 'attendance_compliance_score':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('day', "checkIn") AS date,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE("confidence", 0) >= 0.8) / COUNT(*), 2) AS ontime_pct,
                 COUNT(*) FILTER (WHERE "withinFence" = FALSE) AS no_show_count,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE "withinFence" = FALSE) / COUNT(*), 2) AS absence_rate
          FROM "Attendance"
          WHERE "tenantId" = ${tenantId}
            AND "checkIn" >= ${since}
          GROUP BY date
          ORDER BY date DESC;
        `;
        break;
      case 'leave_impact_analyzer':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT "skillType" AS leave_type,
                 COUNT(*) AS requests,
                 COUNT(*) FILTER (WHERE "state" = 'ON_LEAVE') AS approved,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE "state" = 'ON_LEAVE') / NULLIF(COUNT(*), 0), 2) AS approval_rate,
                 5.0 AS avg_duration_days
          FROM "users"
          WHERE "tenantId" = ${tenantId}
            AND "skillType" IS NOT NULL
          GROUP BY "skillType"
          ORDER BY requests DESC;
        `;
        break;
      case 'compliance_risk_heatmap':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT 'FACE_REGISTRATION' AS doc_type,
                 COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE "faceRegistered" = FALSE) AS expired,
                 COUNT(*) FILTER (WHERE "biometricPending" = TRUE) AS expiring_soon,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE "faceRegistered" = TRUE) / COUNT(*), 2) AS compliance_pct
          FROM "users"
          WHERE "tenantId" = ${tenantId}
          UNION ALL
          SELECT 'FINGERPRINT_REGISTRATION' AS doc_type,
                 COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE "fingerprintRegistered" = FALSE) AS expired,
                 COUNT(*) FILTER (WHERE "biometricPending" = TRUE) AS expiring_soon,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE "fingerprintRegistered" = TRUE) / COUNT(*), 2) AS compliance_pct
          FROM "users"
          WHERE "tenantId" = ${tenantId};
        `;
        break;

      // ─── SUPERVISOR CHARTS ───────────────────────────────────────────────────
      case 'live_workforce_activity_stream':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT a."userId" AS user_id,
                 u."firstName" || ' ' || u."lastName" AS worker_name,
                 a."checkIn" AS event_time,
                 a."kioskId" AS site_id,
                 CASE WHEN a."checkOut" IS NULL THEN 'ACTIVE' ELSE 'INACTIVE' END AS status
          FROM "Attendance" a
          LEFT JOIN "users" u ON a."userId" = u."id"
          WHERE a."checkIn" >= ${since}
            AND a."tenantId" = ${tenantId}
          ORDER BY a."checkIn" DESC
          LIMIT 250;
        `;
        break;
      case 'task_completion_velocity':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('hour', "checkIn") AS hour,
                 COUNT(*) AS tasks_completed,
                 ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600)::numeric, 1) AS avg_hours_to_complete,
                 COUNT(*) FILTER (WHERE "withinFence" = TRUE) AS ontime_tasks
          FROM "Attendance"
          WHERE "tenantId" = ${tenantId}
            AND "checkIn" >= ${since}
          GROUP BY hour
          ORDER BY hour DESC;
        `;
        break;
      case 'attendance_drift_detector':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('day', a."checkIn") AS date,
                 a."userId" AS user_id,
                 u."firstName" || ' ' || u."lastName" AS worker_name,
                 ROUND(AVG(CASE WHEN EXTRACT(HOUR FROM a."checkIn") > 8 
                                THEN (EXTRACT(HOUR FROM a."checkIn") - 8) * 60 + EXTRACT(MINUTE FROM a."checkIn")
                                ELSE 0 END)::numeric, 1) AS avg_minutes_late,
                 COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM a."checkIn") >= 9) AS late_days
          FROM "Attendance" a
          LEFT JOIN "users" u ON a."userId" = u."id"
          WHERE a."tenantId" = ${tenantId}
            AND a."checkIn" >= ${since}
          GROUP BY date, a."userId", u."firstName", u."lastName"
          ORDER BY date DESC;
        `;
        break;
      case 'incident_response_timeline':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT "type" AS incident_type,
                 COUNT(*) AS count,
                 15 AS avg_response_time_min,
                 3 AS avg_resolution_time_hours,
                 3 AS avg_mttr
          FROM "Incident"
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${since}
          GROUP BY "type"
          ORDER BY count DESC;
        `;
        break;
      case 'worker_load_distribution':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT a."userId" AS user_id,
                 u."firstName" || ' ' || u."lastName" AS worker_name,
                 COUNT(DISTINCT date_trunc('day', a."checkIn")) AS active_days,
                 COUNT(a."id") AS total_tasks_assigned,
                 ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(a."checkOut", a."checkIn") - a."checkIn"))/3600)::numeric, 1) AS avg_shift_hours
          FROM "Attendance" a
          LEFT JOIN "users" u ON a."userId" = u."id"
          WHERE a."tenantId" = ${tenantId}
            AND a."checkIn" >= ${since}
          GROUP BY a."userId", u."firstName", u."lastName"
          ORDER BY total_tasks_assigned DESC;
        `;
        break;

      // ─── SECURITY_OFFICER CHARTS ─────────────────────────────────────────────
      case 'spoof_detection_confidence_trend':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('hour', "checkIn") AS hour,
                 COUNT(*) AS total_attempts,
                 COUNT(*) FILTER (WHERE COALESCE("confidence", 0) < 0.7) AS suspected_spoof,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE("confidence", 0) < 0.7) / COUNT(*), 2) AS spoof_rate_pct,
                 ROUND(AVG("confidence")::numeric, 2) AS avg_confidence
          FROM "Attendance"
          WHERE "tenantId" = ${tenantId}
            AND "checkIn" >= ${since}
          GROUP BY hour
          ORDER BY hour DESC;
        `;
        break;
      case 'access_anomaly_detector':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT a."userId" AS user_id,
                 u."firstName" || ' ' || u."lastName" AS worker_name,
                 a."kioskId" AS kiosk_id,
                 COUNT(*) AS access_attempts,
                 COUNT(*) FILTER (WHERE COALESCE(a."confidence", 0) < 0.7) AS failures,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE(a."confidence", 0) < 0.7) / COUNT(*), 2) AS failure_rate,
                 COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM a."checkIn") NOT BETWEEN 6 AND 18) AS offhours_attempts
          FROM "Attendance" a
          LEFT JOIN "users" u ON a."userId" = u."id"
          WHERE a."tenantId" = ${tenantId}
            AND a."checkIn" >= ${since}
          GROUP BY a."userId", u."firstName", u."lastName", a."kioskId"
          ORDER BY failure_rate DESC;
        `;
        break;
      case 'geofence_breach_map':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT s."id" AS site_id,
                 s."name" AS site_name,
                 s."latitude" AS geo_lat,
                 s."longitude" AS geo_lon,
                 COUNT(a."id") AS breaches_last_hour,
                 MAX(a."checkIn") AS last_breach_time
          FROM "Site" s
          LEFT JOIN "Attendance" a ON a."kioskId" = s."id" 
            AND a."checkIn" >= now() - interval '1 hour'
            AND a."withinFence" = FALSE
          WHERE s."tenantId" = ${tenantId}
          GROUP BY s."id", s."name", s."latitude", s."longitude"
          ORDER BY breaches_last_hour DESC;
        `;
        break;
      case 'worker_blacklist_impact_chart':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT u."id" AS user_id,
                 u."firstName" || ' ' || u."lastName" AS worker_name,
                 COUNT(a."id") AS access_attempts_since_block,
                 COUNT(a."id") FILTER (WHERE a."withinFence" = FALSE) AS denied_entries,
                 ROUND(100.0 * COUNT(a."id") FILTER (WHERE a."withinFence" = FALSE) / NULLIF(COUNT(a."id"), 0), 2) AS block_enforcement_pct
          FROM "users" u
          LEFT JOIN "Attendance" a ON a."userId" = u."id"
          WHERE u."tenantId" = ${tenantId}
            AND u."state" IN ('SUSPENDED', 'TERMINATED', 'BLACKLISTED')
          GROUP BY u."id", u."firstName", u."lastName"
          ORDER BY access_attempts_since_block DESC;
        `;
        break;
      case 'surveillance_event_index':
        if (!tenantId) break;
        rows = await this.prisma.$queryRaw`
          SELECT k."id" AS camera_id,
                 k."name" AS camera_name,
                 s."id" AS site_id,
                 s."name" AS site_name,
                 COUNT(i."id") AS total_alerts,
                 COUNT(i."id") FILTER (WHERE i."severity" = 'HIGH') AS high_priority_alerts,
                 COUNT(i."id") FILTER (WHERE i."severity" = 'CRITICAL') AS critical_alerts
          FROM "Kiosk" k
          JOIN "Site" s ON k."siteId" = s."id"
          LEFT JOIN "Incident" i ON i."tenantId" = s."tenantId" AND i."createdAt" >= ${since}
          WHERE s."tenantId" = ${tenantId}
          GROUP BY k."id", k."name", s."id", s."name"
          ORDER BY total_alerts DESC;
        `;
        break;

      // ─── VENDOR_MANAGER CHARTS ───────────────────────────────────────────────
      case 'vendor_productivity_index':
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('day', a."checkIn") AS day,
                 COUNT(a."id") AS tasks_completed,
                 COUNT(DISTINCT a."userId") AS workers_active,
                 ROUND(COUNT(a."id")::numeric / NULLIF(COUNT(DISTINCT a."userId"), 0), 2) AS tasks_per_worker,
                 ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(a."checkOut", a."checkIn") - a."checkIn"))/3600)::numeric, 1) AS avg_completion_hours
          FROM "Attendance" a
          JOIN "users" u ON a."userId" = u."id"
          WHERE u."vendorId" = (SELECT "id" FROM "Vendor" WHERE "managerId" = ${user.id} LIMIT 1)
            AND a."checkIn" >= ${since}
          GROUP BY day
          ORDER BY day DESC;
        `;
        break;
      case 'cost_vs_output_curve':
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('month', a."checkIn") AS period_end,
                 COUNT(DISTINCT a."userId") AS workers_paid,
                 ROUND(SUM(100 + 15 * (EXTRACT(EPOCH FROM (COALESCE(a."checkOut", a."checkIn") - a."checkIn"))/3600))::numeric, 2) AS total_cost,
                 COUNT(a."id") AS output_units,
                 ROUND(COUNT(a."id")::numeric / NULLIF(COUNT(DISTINCT a."userId"), 0), 2) AS output_per_worker
          FROM "Attendance" a
          JOIN "users" u ON a."userId" = u."id"
          WHERE u."vendorId" = (SELECT "id" FROM "Vendor" WHERE "managerId" = ${user.id} LIMIT 1)
            AND a."checkIn" >= ${since}
          GROUP BY period_end
          ORDER BY period_end DESC;
        `;
        break;
      case 'compliance_adherence_score':
        rows = await this.prisma.$queryRaw`
          SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE u."faceRegistered" = TRUE) / COUNT(*), 2) AS compliance_pct,
                 COUNT(*) FILTER (WHERE u."faceRegistered" = FALSE) AS expired_docs,
                 COUNT(*) AS total_workers,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE u."isActive" = TRUE) / COUNT(*), 2) AS attendance_coverage_pct
          FROM "users" u
          WHERE u."vendorId" = (SELECT "id" FROM "Vendor" WHERE "managerId" = ${user.id} LIMIT 1);
        `;
        break;
      case 'worker_allocation_distribution':
        rows = await this.prisma.$queryRaw`
          SELECT s."id" AS site_id,
                 s."name" AS site_name,
                 COUNT(DISTINCT ws."workerId") AS workers_allocated,
                 COUNT(ws."id") AS total_shifts
          FROM "Site" s
          JOIN "WorkerSite" ws ON ws."siteId" = s."id"
          JOIN "users" u ON ws."workerId" = u."id"
          WHERE u."vendorId" = (SELECT "id" FROM "Vendor" WHERE "managerId" = ${user.id} LIMIT 1)
          GROUP BY s."id", s."name"
          ORDER BY workers_allocated DESC;
        `;
        break;

      // ─── WORKER CHARTS ───────────────────────────────────────────────────────
      case 'attendance_consistency_score':
        rows = await this.prisma.$queryRaw`
          SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE("confidence", 0) >= 0.8) / COUNT(*), 2) AS ontime_pct,
                 COUNT(*) FILTER (WHERE "withinFence" = FALSE) AS absences,
                 COUNT(*) AS total_shifts,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE "withinFence" = TRUE) / COUNT(*), 2) AS attendance_rate
          FROM "Attendance"
          WHERE "userId" = ${user.id}
            AND "checkIn" >= ${since};
        `;
        break;
      case 'shift_completion_timeline':
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('day', "checkIn") AS date,
                 "checkIn" AS shift_start_time,
                 "checkOut" AS shift_end_time,
                 "checkIn" AS actual_checkin,
                 CASE WHEN "checkOut" IS NULL THEN 'PRESENT' ELSE 'COMPLETED' END AS status,
                 ROUND(CASE WHEN EXTRACT(HOUR FROM "checkIn") > 8 
                            THEN (EXTRACT(HOUR FROM "checkIn") - 8) * 60 + EXTRACT(MINUTE FROM "checkIn")
                            ELSE 0 END::numeric, 1) AS minutes_late
          FROM "Attendance"
          WHERE "userId" = ${user.id}
            AND "checkIn" >= ${since}
          ORDER BY "checkIn" DESC;
        `;
        break;
      case 'earnings_overtime_tracker':
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('month', "checkIn") AS month,
                 500.00 AS base_salary,
                 ROUND(SUM(CASE WHEN (EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600) > 8 
                                THEN (EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600) - 8
                                ELSE 0 END)::numeric, 1) AS overtime_hours,
                 30.00 AS overtime_rate,
                 ROUND(SUM(CASE WHEN (EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600) > 8 
                                THEN ((EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600) - 8) * 30
                                ELSE 0 END)::numeric, 2) AS overtime_pay,
                 ROUND(SUM(100 + 20 * (EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600))::numeric, 2) AS total_pay
          FROM "Attendance"
          WHERE "userId" = ${user.id}
            AND "checkIn" >= ${since}
          GROUP BY month
          ORDER BY month DESC;
        `;
        break;
      case 'activity_summary_timeline':
        rows = await this.prisma.$queryRaw`
          SELECT date_trunc('day', "checkIn") AS date,
                 MIN("checkIn") AS first_checkin,
                 MAX("checkOut") AS last_checkout,
                 ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE("checkOut", "checkIn") - "checkIn"))/3600)::numeric, 2) AS hours_worked,
                 COUNT(*) AS event_count
          FROM "Attendance"
          WHERE "userId" = ${user.id}
            AND "checkIn" >= ${since}
          GROUP BY date
          ORDER BY date DESC;
        `;
        break;

      default:
        rows = [];
        break;
    }

    return {
      chart,
      timeRange: params.timeRange || 'last_30d',
      tenantId,
      rows,
    };
  }

  async getInferenceLogsScoped(user: any, filter: { method?: string; outcome?: string; userId?: string; limit?: number }) {
    const scope = tenantScope(user);
    const isPlatform = !scope.tenantId;
    const tenantId = scope.tenantId;
    let targetUserId: string | string[] | undefined = filter.userId;
    if (!isPlatform) {
      const orgUsers = await this.prisma.user.findMany({
        where: { tenantId },
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
    const scope = tenantScope(user);
    const isPlatform = !scope.tenantId;
    const tenantId = scope.tenantId;
    let targetUserId: string | string[] | undefined = userId;
    if (!isPlatform) {
      const orgUsers = await this.prisma.user.findMany({
        where: { tenantId },
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
    const scope = tenantScope(user);
    const isPlatform = !scope.tenantId;
    const tenantId = scope.tenantId;
    let targetUserId: string | string[] | undefined = userId;
    if (!isPlatform) {
      const orgUsers = await this.prisma.user.findMany({
        where: { tenantId },
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
