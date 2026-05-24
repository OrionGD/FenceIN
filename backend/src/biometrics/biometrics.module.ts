import { Module } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import { BiometricsController } from './biometrics.controller';

@Module({
  providers: [BiometricsService],
  controllers: [BiometricsController]
})
export class BiometricsModule {}
