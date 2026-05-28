import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AiInferenceLogDocument = HydratedDocument<AiInferenceLog>;

export type BiometricMethod = 'face' | 'fingerprint';
export type InferenceOutcome = 'match' | 'no_match' | 'liveness_fail' | 'engine_offline' | 'ambiguous';

@Schema({ collection: 'ai_inference_logs', timestamps: true })
export class AiInferenceLog {
  @Prop({ type: String, default: null, index: true })
  tenantId: string | null;

  /** PostgreSQL User.id of the matched or attempted identity */
  @Prop({ type: String, default: null })
  userId: string | null;

  @Prop({ required: true, enum: ['face', 'fingerprint'] })
  method: BiometricMethod;

  @Prop({ required: true, enum: ['match', 'no_match', 'liveness_fail', 'engine_offline', 'ambiguous'] })
  outcome: InferenceOutcome;

  /** Cosine similarity score (0–1) for face, ORB match score for fingerprint */
  @Prop({ type: Number, default: null })
  confidence: number | null;

  /** Laplacian texture variance score from liveness detection */
  @Prop({ type: Number, default: null })
  livenessScore: number | null;

  /** Whether passive liveness check passed */
  @Prop({ type: Boolean, default: null })
  livenessPass: boolean | null;

  /** Number of ORB feature matches (fingerprint only) */
  @Prop({ type: Number, default: null })
  goodMatches: number | null;

  /** Python engine latency in ms */
  @Prop({ type: Number, default: null })
  engineLatencyMs: number | null;

  @Prop({ default: 'unknown' })
  ipAddress: string;

  @Prop({ type: String, default: null })
  failureReason: string | null;
}

export const AiInferenceLogSchema = SchemaFactory.createForClass(AiInferenceLog);
AiInferenceLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
AiInferenceLogSchema.index({ tenantId: 1, method: 1, outcome: 1 });
AiInferenceLogSchema.index({ createdAt: -1 });
