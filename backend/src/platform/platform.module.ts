import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AuthModule, AnalyticsModule],
  controllers: [PlatformController],
})
export class PlatformModule {}
