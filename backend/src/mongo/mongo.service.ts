import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { AiInferenceLog, AiInferenceLogDocument, BiometricMethod, InferenceOutcome } from './schemas/ai-inference-log.schema';
import { AnalyticsSnapshot, AnalyticsSnapshotDocument } from './schemas/analytics-snapshot.schema';
import { AiChat, AiChatDocument } from './schemas/ai-chat.schema';
import { Telemetry, TelemetryDocument } from './schemas/telemetry.schema';

@Injectable()
export class MongoService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(AiInferenceLog.name) private inferenceModel: Model<AiInferenceLogDocument>,
    @InjectModel(AnalyticsSnapshot.name) private snapshotModel: Model<AnalyticsSnapshotDocument>,
    @InjectModel(AiChat.name) private aiChatModel: Model<AiChatDocument>,
    @InjectModel(Telemetry.name) private telemetryModel: Model<TelemetryDocument>,
  ) {}

  // ─── AUDIT LOGS ──────────────────────────────────────────────────────────────

  async logAudit(data: {
    tenantId?: string | null;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValue?: Record<string, any> | null;
    newValue?: Record<string, any> | null;
    ipAddress?: string;
    device?: string;
  }): Promise<void> {
    try {
      await this.auditLogModel.create({
        tenantId: data.tenantId ?? null,
        userId: data.userId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        oldValue: data.oldValue ?? null,
        newValue: data.newValue ?? null,
        ipAddress: data.ipAddress ?? 'unknown',
        device: data.device ?? 'unknown',
      });
    } catch (err) {
      console.error('[MongoService] Failed to write audit log:', err);
    }
  }

  async getAuditLogs(tenantId?: string | null, userId?: string | string[], limit = 50): Promise<AuditLogDocument[]> {
    const filter: Record<string, any> = {};
    if (tenantId !== undefined) filter.tenantId = tenantId;
    if (userId) {
      if (Array.isArray(userId)) {
        filter.userId = { $in: userId };
      } else {
        filter.userId = userId;
      }
    }
    return this.auditLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec() as any;
  }

  // ─── AI INFERENCE LOGS ───────────────────────────────────────────────────────

  async logInference(data: {
    tenantId?: string | null;
    userId?: string | null;
    method: BiometricMethod;
    outcome: InferenceOutcome;
    confidence?: number | null;
    livenessScore?: number | null;
    livenessPass?: boolean | null;
    goodMatches?: number | null;
    engineLatencyMs?: number | null;
    ipAddress?: string;
    failureReason?: string | null;
  }): Promise<void> {
    try {
      await this.inferenceModel.create({
        tenantId: data.tenantId ?? null,
        userId: data.userId ?? null,
        method: data.method,
        outcome: data.outcome,
        confidence: data.confidence ?? null,
        livenessScore: data.livenessScore ?? null,
        livenessPass: data.livenessPass ?? null,
        goodMatches: data.goodMatches ?? null,
        engineLatencyMs: data.engineLatencyMs ?? null,
        ipAddress: data.ipAddress ?? 'unknown',
        failureReason: data.failureReason ?? null,
      });
    } catch (err) {
      console.error('[MongoService] Failed to write inference log:', err);
    }
  }

  async getInferenceLogs(filter: {
    tenantId?: string | null;
    method?: string;
    outcome?: string;
    userId?: string | string[];
    limit?: number;
  }): Promise<AiInferenceLogDocument[]> {
    const query: Record<string, any> = {};
    if (filter.tenantId !== undefined) query.tenantId = filter.tenantId;
    if (filter.method) query.method = filter.method;
    if (filter.outcome) query.outcome = filter.outcome;
    if (filter.userId) {
      if (Array.isArray(filter.userId)) {
        query.userId = { $in: filter.userId };
      } else {
        query.userId = filter.userId;
      }
    }
    return this.inferenceModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filter.limit ?? 100)
      .lean()
      .exec() as any;
  }

  // ─── ANALYTICS SNAPSHOTS ─────────────────────────────────────────────────────

  async upsertSnapshot(tenantId: string | null, period: 'hourly' | 'daily' | 'weekly', bucket: string, delta: Partial<{
    totalCheckIns: number;
    uniqueWorkers: number;
    faceAuthAttempts: number;
    faceAuthSuccesses: number;
    fingerprintAuthAttempts: number;
    fingerprintAuthSuccesses: number;
    livenessFailures: number;
    spoofAttempts: number;
    avgFaceConfidence: number;
    avgEngineLatencyMs: number;
  }>): Promise<void> {
    try {
      await this.snapshotModel.findOneAndUpdate(
        { tenantId, period, bucket },
        { $inc: delta, $setOnInsert: { tenantId, period, bucket } },
        { upsert: true, new: true },
      );
    } catch (err) {
      console.error('[MongoService] Failed to upsert analytics snapshot:', err);
    }
  }

  async getSnapshots(tenantId: string | null, period: 'hourly' | 'daily' | 'weekly', limit = 30): Promise<AnalyticsSnapshotDocument[]> {
    const filter: Record<string, any> = { period };
    if (tenantId !== undefined) filter.tenantId = tenantId;
    return this.snapshotModel
      .find(filter)
      .sort({ bucket: -1 })
      .limit(limit)
      .lean()
      .exec() as any;
  }

  async getLatestSnapshot(tenantId: string | null, period: 'hourly' | 'daily' | 'weekly'): Promise<AnalyticsSnapshotDocument | null> {
    const filter: Record<string, any> = { period };
    if (tenantId !== undefined) filter.tenantId = tenantId;
    return this.snapshotModel
      .findOne(filter)
      .sort({ bucket: -1 })
      .lean()
      .exec() as any;
  }

  // ─── AI CHAT HISTORY ─────────────────────────────────────────────────────────

  async logAiChat(data: {
    tenantId?: string | null;
    userId?: string | null;
    query: string;
    answer: string;
    model?: string;
    tokensUsed?: number | null;
    context?: Record<string, any> | null;
  }): Promise<void> {
    try {
      await this.aiChatModel.create({
        tenantId: data.tenantId ?? null,
        userId: data.userId ?? null,
        query: data.query,
        answer: data.answer,
        aiModel: data.model ?? 'llama-3.3-70b-versatile',
        tokensUsed: data.tokensUsed ?? null,
        context: data.context ?? null,
      });
    } catch (err) {
      console.error('[MongoService] Failed to write AI chat log:', err);
    }
  }

  async getAiChatHistory(tenantId?: string | null, userId?: string | string[], limit = 20): Promise<AiChatDocument[]> {
    const filter: Record<string, any> = {};
    if (tenantId !== undefined) filter.tenantId = tenantId;
    if (userId) {
      if (Array.isArray(userId)) {
        filter.userId = { $in: userId };
      } else {
        filter.userId = userId;
      }
    }
    return this.aiChatModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec() as any;
  }

  // ─── TELEMETRY ───────────────────────────────────────────────────────────────

  async logTelemetry(data: {
    tenantId?: string | null;
    source: 'python_engine' | 'nestjs_gateway' | 'frontend';
    event: string;
    statusCode?: number | null;
    latencyMs?: number | null;
    deviceId?: string | null;
    engineVersion?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<void> {
    try {
      await this.telemetryModel.create({
        tenantId: data.tenantId ?? null,
        source: data.source,
        event: data.event,
        statusCode: data.statusCode ?? null,
        latencyMs: data.latencyMs ?? null,
        deviceId: data.deviceId ?? null,
        engineVersion: data.engineVersion ?? null,
        metadata: data.metadata ?? null,
      });
    } catch (err) {
      console.error('[MongoService] Failed to write telemetry:', err);
    }
  }
}
