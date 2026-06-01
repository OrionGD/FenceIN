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
import { TenantGuard } from '../auth/tenant.guard';

@Controller('biometrics')
export class BiometricsController {
  constructor(private readonly biometricsService: BiometricsService) {}

  // ─── Enrollment (requires authenticated JWT) ──────────────────────────────

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('enroll')
  enrollFace(@Body() dto: EnrollFaceDto, @Request() req: any) {
    if (!dto.userId && req.user) {
      dto.userId = req.user.userId;
    }
    return this.biometricsService.enrollFace(dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('enroll-fingerprint')
  enrollFingerprint(@Body() dto: EnrollFingerprintDto) {
    return this.biometricsService.enrollFingerprint(dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('revoke')
  revokeBiometrics(@Request() req: any) {
    const userId = req.user.userId;
    return this.biometricsService.revokeBiometrics(userId);
  }

  // ─── Legacy 1:1 verification (requires pre-auth JWT + userId) ────────────

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('match')
  matchFace(@Body() dto: MatchFaceDto, @Request() req: any) {
    if (!dto.email && req.user) {
      dto.email = req.user.email;
    }
    return this.biometricsService.matchFace(dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('verify')
  verifyFace(@Body() dto: VerifyFaceDto, @Request() req: any) {
    if (!dto.userId && req.user) {
      dto.userId = req.user.userId;
    }
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.biometricsService.verifyFace(dto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
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

  // ─── Direct Setup & Onboarding (Centralized under /biometrics) ─────────────

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('face/register')
  async registerFace(@Body() dto: EnrollFaceDto, @Request() req: any) {
    const userId = dto.userId || req.user?.userId || req.user?.sub;
    dto.userId = userId;
    
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'web';
    
    return this.biometricsService.enrollFace(dto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('fingerprint/register')
  async registerFingerprint(@Body() dto: EnrollFingerprintDto, @Request() req: any) {
    const userId = dto.userId || req.user?.userId || req.user?.sub;
    dto.userId = userId;
    
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'web';
    
    return this.biometricsService.enrollFingerprint(dto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('skip')
  async skip(@Body() body: { reason?: string }, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    const reason = body.reason || 'user_opt_out';
    
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'web';
    
    return this.biometricsService.skipBiometrics(userId, reason, ipAddress, userAgent);
  }
}
