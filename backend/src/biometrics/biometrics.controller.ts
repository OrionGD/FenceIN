import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import {
  EnrollFaceDto,
  MatchFaceDto,
  EnrollFingerprintDto,
  VerifyFingerprintDto,
  VerifyFaceDto,
  IdentifyByFaceDto,
  IdentifyByFingerprintDto,
} from './biometrics.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('biometrics')
export class BiometricsController {
  constructor(private readonly biometricsService: BiometricsService) {}

  // ─── Enrollment (requires authenticated JWT) ──────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('enroll')
  enrollFace(@Body() dto: EnrollFaceDto) {
    return this.biometricsService.enrollFace(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('enroll-fingerprint')
  enrollFingerprint(@Body() dto: EnrollFingerprintDto) {
    return this.biometricsService.enrollFingerprint(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('revoke')
  revokeBiometrics(@Request() req: any) {
    const userId = req.user.userId;
    return this.biometricsService.revokeBiometrics(userId);
  }

  // ─── Legacy 1:1 verification (requires pre-auth JWT + userId) ────────────

  @UseGuards(JwtAuthGuard)
  @Post('match')
  matchFace(@Body() dto: MatchFaceDto) {
    return this.biometricsService.matchFace(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verifyFace(@Body() dto: VerifyFaceDto, @Request() req: any) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.biometricsService.verifyFace(dto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-fingerprint')
  verifyFingerprint(@Body() dto: VerifyFingerprintDto, @Request() req: any) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.biometricsService.verifyFingerprint(dto, ipAddress, userAgent);
  }

  // ─── INDEPENDENT BIOMETRIC LOGIN (no JWT, no userId, no email required) ──
  //
  // These endpoints implement "Who does this biometric belong to?" logic.
  // They answer identity entirely from the biometric itself, not from any
  // pre-supplied user identifier.

  @Post('identify-face')
  identifyByFace(@Body() dto: IdentifyByFaceDto, @Request() req: any) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.biometricsService.identifyByFace(dto, ipAddress, userAgent);
  }

  @Post('identify-fingerprint')
  identifyByFingerprint(@Body() dto: IdentifyByFingerprintDto, @Request() req: any) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.biometricsService.identifyByFingerprint(dto, ipAddress, userAgent);
  }
}
