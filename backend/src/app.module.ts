import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MongoModule } from './mongo/mongo.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { join } from 'path';
import { WorkersModule } from './workers/workers.module';
import { VendorsModule } from './vendors/vendors.module';
import { AttendanceModule } from './attendance/attendance.module';
import { BiometricsModule } from './biometrics/biometrics.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { SitesModule } from './sites/sites.module';
import { ShiftsModule } from './shifts/shifts.module';
import { ReportsModule } from './reports/reports.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PlatformModule } from './platform/platform.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '..', '.env'),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    // ── Databases ──────────────────────────────────────────────────
    PrismaModule,   // PostgreSQL — Identity, RBAC, Workforce
    MongoModule,    // MongoDB   — AI Metadata, Logs, Analytics, Telemetry
    // ── Feature Modules ────────────────────────────────────────────
    UsersModule,
    AuthModule,
    WorkersModule,
    VendorsModule,
    AttendanceModule,
    BiometricsModule,
    EventsModule,
    AiModule,
    SitesModule,
    ShiftsModule,
    ReportsModule,
    AnalyticsModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
