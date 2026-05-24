import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import { EnrollFaceDto, MatchFaceDto } from './biometrics.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('biometrics')
export class BiometricsController {
  constructor(private readonly biometricsService: BiometricsService) {}

  // Self-enrollment: any authenticated user can register their own face during onboarding
  @UseGuards(JwtAuthGuard)
  @Post('enroll')
  enrollFace(@Body() dto: EnrollFaceDto) {
    return this.biometricsService.enrollFace(dto);
  }

  // Matching can be public if used by the kiosk, but usually secured by a Kiosk Token
  // We'll leave it open for Kiosk mode implementation
  @Post('match')
  matchFace(@Body() dto: MatchFaceDto) {
    return this.biometricsService.matchFace(dto);
  }
}
