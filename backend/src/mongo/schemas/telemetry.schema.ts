import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TelemetryDocument = HydratedDocument<Telemetry>;

@Schema({ collection: 'telemetry', timestamps: true })
export class Telemetry {
  @Prop({ type: String, default: null, index: true })
  tenantId: string | null;

  /** Service that emitted this telemetry event */
  @Prop({ required: true, enum: ['python_engine', 'nestjs_gateway', 'frontend'] })
  source: string;

  /** Event type, e.g. 'health_check', 'request_latency', 'device_ping' */
  @Prop({ required: true })
  event: string;

  /** HTTP status code if applicable */
  @Prop({ type: Number, default: null })
  statusCode: number | null;

  /** Latency in milliseconds */
  @Prop({ type: Number, default: null })
  latencyMs: number | null;

  /** Device ID (kiosk or mobile) */
  @Prop({ type: String, default: null })
  deviceId: string | null;

  /** Python engine version or build */
  @Prop({ type: String, default: null })
  engineVersion: string | null;

  /** Free-form metadata payload */
  @Prop({ type: Object, default: null })
  metadata: Record<string, any> | null;
}

export const TelemetrySchema = SchemaFactory.createForClass(Telemetry);
TelemetrySchema.index({ tenantId: 1, source: 1, event: 1, createdAt: -1 });
TelemetrySchema.index({ createdAt: -1 });
// TTL: auto-delete raw telemetry after 30 days
TelemetrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
