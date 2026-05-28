import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnalyticsSnapshotDocument = HydratedDocument<AnalyticsSnapshot>;

@Schema({ collection: 'analytics_snapshots', timestamps: true })
export class AnalyticsSnapshot {
  @Prop({ type: String, default: null, index: true })
  tenantId: string | null;

  /** Snapshot granularity: 'hourly' | 'daily' | 'weekly' */
  @Prop({ required: true, enum: ['hourly', 'daily', 'weekly'] })
  period: string;

  /** ISO date string for this snapshot bucket (e.g. "2026-05-28" for daily) */
  @Prop({ required: true })
  bucket: string;

  @Prop({ type: Number, default: 0 })
  totalCheckIns: number;

  @Prop({ type: Number, default: 0 })
  uniqueWorkers: number;

  @Prop({ type: Number, default: 0 })
  faceAuthAttempts: number;

  @Prop({ type: Number, default: 0 })
  faceAuthSuccesses: number;

  @Prop({ type: Number, default: 0 })
  fingerprintAuthAttempts: number;

  @Prop({ type: Number, default: 0 })
  fingerprintAuthSuccesses: number;

  @Prop({ type: Number, default: 0 })
  livenessFailures: number;

  @Prop({ type: Number, default: 0 })
  spoofAttempts: number;

  /** Average face match confidence across all successful attempts */
  @Prop({ type: Number, default: null })
  avgFaceConfidence: number | null;

  /** Average Python engine response latency in ms */
  @Prop({ type: Number, default: null })
  avgEngineLatencyMs: number | null;

  /** Snapshot is marked stale if data has been invalidated */
  @Prop({ default: false })
  stale: boolean;
}

export const AnalyticsSnapshotSchema = SchemaFactory.createForClass(AnalyticsSnapshot);
AnalyticsSnapshotSchema.index({ tenantId: 1, period: 1, bucket: 1 }, { unique: true });
AnalyticsSnapshotSchema.index({ createdAt: -1 });
