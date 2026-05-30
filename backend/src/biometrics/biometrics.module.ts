import { Module, forwardRef } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import { BiometricsController } from './biometrics.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [BiometricsService],
  controllers: [BiometricsController],
  exports: [BiometricsService],
})
export class BiometricsModule {}
