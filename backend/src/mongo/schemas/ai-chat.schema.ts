import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AiChatDocument = HydratedDocument<AiChat>;

@Schema({ collection: 'ai_chat_history', timestamps: true })
export class AiChat {
  @Prop({ type: String, default: null, index: true })
  tenantId: string | null;

  /** PostgreSQL User.id of the person who asked */
  @Prop({ type: String, default: null })
  userId: string | null;

  @Prop({ required: true })
  query: string;

  @Prop({ required: true })
  answer: string;

  /** Groq model used */
  @Prop({ default: 'llama-3.3-70b-versatile' })
  aiModel: string;

  /** Tokens used (prompt + completion) */
  @Prop({ type: Number, default: null })
  tokensUsed: number | null;

  /** Context injected into the prompt */
  @Prop({ type: Object, default: null })
  context: Record<string, any> | null;
}

export const AiChatSchema = SchemaFactory.createForClass(AiChat);
AiChatSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
