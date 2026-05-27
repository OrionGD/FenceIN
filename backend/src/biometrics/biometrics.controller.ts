import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import { EnrollFaceDto, MatchFaceDto, EnrollFingerprintDto, VerifyFingerprintDto, VerifyFaceDto } from './biometrics.dto';
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

  // 1:N matching strictly requires a valid JWT — prevents unauthenticated biometric profiling
  @UseGuards(JwtAuthGuard)
  @Post('match')
  matchFace(@Body() dto: MatchFaceDto) {
    return this.biometricsService.matchFace(dto);
  }

  // 1:1 strict verification bounded to a specific user
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verifyFace(@Body() dto: VerifyFaceDto, @Request() req: any) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.biometricsService.verifyFace(dto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('enroll-fingerprint')
  enrollFingerprint(@Body() dto: EnrollFingerprintDto) {
    return this.biometricsService.enrollFingerprint(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-fingerprint')
  verifyFingerprint(@Body() dto: VerifyFingerprintDto, @Request() req: any) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.biometricsService.verifyFingerprint(dto, ipAddress, userAgent);
  }
}
