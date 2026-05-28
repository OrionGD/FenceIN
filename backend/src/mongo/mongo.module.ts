import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoService } from './mongo.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AiInferenceLog, AiInferenceLogSchema } from './schemas/ai-inference-log.schema';
import { AnalyticsSnapshot, AnalyticsSnapshotSchema } from './schemas/analytics-snapshot.schema';
import { AiChat, AiChatSchema } from './schemas/ai-chat.schema';
import { Telemetry, TelemetrySchema } from './schemas/telemetry.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const uri = config.get<string>('MONGO_URI');
        if (!uri) {
          console.warn('[MongoModule] ⚠️  MONGO_URI not set — MongoDB features disabled.');
        }
        return {
          uri: uri || 'mongodb://localhost:27017/fencein_fallback',
          dbName: 'fencein',
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000,
        };
      },
    }),
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: AiInferenceLog.name, schema: AiInferenceLogSchema },
      { name: AnalyticsSnapshot.name, schema: AnalyticsSnapshotSchema },
      { name: AiChat.name, schema: AiChatSchema },
      { name: Telemetry.name, schema: TelemetrySchema },
    ]),
  ],
  providers: [MongoService],
  exports: [MongoService, MongooseModule],
})
export class MongoModule {}
