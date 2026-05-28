import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ type: String, default: null, index: true })
  tenantId: string | null;

  @Prop({ type: String, default: null })
  userId: string | null;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  entityType: string;

  @Prop({ type: String, default: null })
  entityId: string | null;

  @Prop({ type: Object, default: null })
  oldValue: Record<string, any> | null;

  @Prop({ type: Object, default: null })
  newValue: Record<string, any> | null;

  @Prop({ default: 'unknown' })
  ipAddress: string;

  @Prop({ default: 'unknown' })
  device: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
// Index for fast user-based queries and time-range lookups
AuditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });
