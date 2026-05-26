import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import { EnrollFaceDto, MatchFaceDto, EnrollFingerprintDto, VerifyFingerprintDto } from './biometrics.dto';
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

  // 1:1 strict verification bounded to a specific user
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verifyFace(@Body() dto: import('./biometrics.dto').VerifyFaceDto) {
    return this.biometricsService.verifyFace(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('enroll-fingerprint')
  enrollFingerprint(@Body() dto: EnrollFingerprintDto) {
    return this.biometricsService.enrollFingerprint(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-fingerprint')
  verifyFingerprint(@Body() dto: VerifyFingerprintDto) {
    return this.biometricsService.verifyFingerprint(dto);
  }
}
