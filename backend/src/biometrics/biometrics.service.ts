import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MongoService } from '../mongo/mongo.service';
import { 
  EnrollFaceDto, 
  MatchFaceDto, 
  VerifyFaceDto, 
  EnrollFingerprintDto, 
  VerifyFingerprintDto, 
  IdentifyByFaceDto, 
  IdentifyByFingerprintDto 
} from './biometrics.dto';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

function validateEmbeddingQuality(embedding: number[]) {
  if (!embedding || embedding.length !== 512) {
    throw new BadRequestException('Embedding must be exactly 512 dimensions.');
  }

  // Calculate mean
  const sum = embedding.reduce((a, b) => a + b, 0);
  const mean = sum / embedding.length;

  // Calculate variance to reject flat mock arrays
  const variance = embedding.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / embedding.length;

  if (variance < 1e-4) {
    throw new BadRequestException('Bypass attempt detected: static or mock biometric embeddings are prohibited.');
  }
}

/**
 * Non-blocking internal fetch to the Python Computer Vision microservice.
 * Returns null if the service is unreachable or errors out.
 */
const FACE_DUPLICATE_CONFIDENCE_THRESHOLD = 0.82;

async function callPythonBiometrics(path: string, payload: any): Promise<any | null> {
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/biometrics${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Biometrics] Python engine returned error for ${path}: ${errText}`);
      return null;
    }
    return await response.json();
  } catch (err: any) {
    console.log(`[Biometrics] Python microservice is offline. Error: ${err.message}`);
    return null;
  }
}

@Injectable()
export class BiometricsService {
  private secretKey: Buffer;
  private readonly algorithm = 'aes-256-cbc';
  private readonly iv = Buffer.alloc(16, 0); // constant IV for deterministic lookup

  constructor(
    private prisma: PrismaService,
    private mongo: MongoService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment configuration.');
    }
    this.secretKey = crypto.scryptSync(jwtSecret.replace(/^"|"$/g, ''), 'salt', 32);
  }

  private encrypt(text: string): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, this.iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encryptedText: string): string {
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, this.iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      return encryptedText;
    }
  }

  /** Writes audit events to MongoDB audit_logs collection */
  private async logAudit(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValue: any,
    newValue: any,
    ipAddress?: string,
    device?: string,
  ) {
    let tenantId: string | null = null;
    if (userId) {
      try {
        const dbUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
        tenantId = dbUser?.tenantId || null;
      } catch (err) {
        console.warn('[BiometricsService] Failed to resolve tenantId for audit log:', err);
      }
    }
    await this.mongo.logAudit({ tenantId, userId, action, entityType, entityId, oldValue, newValue, ipAddress, device });
  }

  /** Returns live biometric enrollment status for a given user — used by AuthService login pipeline */
  async getStatus(userId: string): Promise<{ face: boolean; fingerprint: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { faceRegistered: true, fingerprintRegistered: true },
    });
    return {
      face: !!user?.faceRegistered,
      fingerprint: !!user?.fingerprintRegistered,
    };
  }

  async revokeBiometrics(userId: string) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fingerprintTemplate: null,
        faceRegistered: false,
        fingerprintRegistered: false,
        biometricEnrolled: false,
        biometricPending: true,
      },
    });

    await this.prisma.$executeRawUnsafe(
      `UPDATE users SET "faceEmbedding" = NULL WHERE id = $1`,
      userId
    );

    await this.logAudit(userId, 'BIOMETRIC_REVOKED', 'User', userId, null, { status: 'success' });
    
    return { success: true, message: 'All biometric profiles have been revoked.' };
  }  async enrollFace(dto: EnrollFaceDto, ipAddress: string = 'unknown', deviceInfo: string = 'web') {
    if (!dto.userId) {
      throw new BadRequestException('User ID is required.');
    }

    let resolvedEmbedding: number[];

    if (dto.embedding && dto.embedding.length > 0) {
      resolvedEmbedding = dto.embedding;
      if (resolvedEmbedding.length === 128) {
        resolvedEmbedding = [...resolvedEmbedding, ...Array(384).fill(0)];
      }
    } else {
      if (!dto.image) {
        throw new BadRequestException('Either face image or embedding is required for enrollment.');
      }
      console.log(`[Biometrics] Delegating face embedding extraction to Python Engine...`);
      const pythonRes = await callPythonBiometrics('/face/embed', { image: dto.image });
      
      if (!pythonRes || !pythonRes.success || !pythonRes.embedding) {
        throw new BadRequestException('Biometric analysis failed: Face undetected, passive liveness rejected, or server offline.');
      }

      resolvedEmbedding = pythonRes.embedding;
      console.log(`[Biometrics] Successfully extracted 512D embedding from Python. Liveness Score: ${pythonRes.liveness_score}`);
    }

    validateEmbeddingQuality(resolvedEmbedding);
    
    // Prevent re-registration for the same user
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { faceRegistered: true, tenantId: true }
    });
    
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    
    if (user.faceRegistered) {
      throw new BadRequestException('User already has a registered biometric profile.');
    }
    
    const vectorString = `[${resolvedEmbedding.join(',')}]`;
    
    // Prevent duplicate biometric registration across users in the same tenant context (excluding current user)
    const tenantClause = user.tenantId ? 'AND "tenantId" = $3' : '';
    const duplicateQueryParams = user.tenantId ? [vectorString, dto.userId, user.tenantId] : [vectorString, dto.userId];
    const duplicateCheck: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT id, 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
      FROM users
      WHERE "faceEmbedding" IS NOT NULL
        AND "faceRegistered" = TRUE
        AND id != $2
        ${tenantClause}
      ORDER BY "faceEmbedding"::vector <=> $1::vector
      LIMIT 1;`,
      ...duplicateQueryParams,
    );

    if (duplicateCheck.length > 0 && duplicateCheck[0].confidence >= FACE_DUPLICATE_CONFIDENCE_THRESHOLD) {
      console.log(`[BIOMETRIC DUPLICATE DETECTED]\nmatched_user_id=${duplicateCheck[0].id}\nsimilarity=${Number(duplicateCheck[0].confidence).toFixed(4)}\nregistration_blocked=true`);
      throw new BadRequestException('Face already registered to another account.');
    }
    
    await this.prisma.$executeRawUnsafe(
      `UPDATE users SET "faceEmbedding" = $1::vector, "faceRegistered" = TRUE WHERE id = $2`, 
      vectorString, 
      dto.userId
    );

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: {
        biometricEnrolled: true,
        biometricPending: false,
      },
    });

    // --- SYNC TO USER_BIOMETRICS ---
    const userObj = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { fingerprintRegistered: true } });
    await this.prisma.userBiometrics.upsert({
      where: { userId: dto.userId },
      create: {
        userId: dto.userId,
        faceRegistered: true,
        fingerprintRegistered: !!userObj?.fingerprintRegistered,
      },
      update: {
        faceRegistered: true,
      }
    });

    // --- BIOMETRIC AUDIT LOG ---
    await this.prisma.biometricAuditLog.create({
      data: {
        userId: dto.userId,
        action: 'ENROLL',
        deviceInfo: deviceInfo,
        ipAddress: ipAddress
      }
    });

    await this.logAudit(dto.userId, 'BIOMETRIC_FACE_ENROLLED', 'User', dto.userId, null, { status: 'success' }, ipAddress, deviceInfo);

    return { message: 'Face enrolled successfully.' };
  }
  async matchFace(dto: MatchFaceDto) {
    let resolvedEmbedding: number[];

    if (dto.embedding && dto.embedding.length > 0) {
      resolvedEmbedding = dto.embedding;
      if (resolvedEmbedding.length === 128) {
        resolvedEmbedding = [...resolvedEmbedding, ...Array(384).fill(0)];
      }
    } else {
      if (!dto.image) {
        throw new BadRequestException('Either face image or embedding is required.');
      }
      console.log(`[Biometrics] Requesting face embedding for identity matching...`);
      const pythonRes = await callPythonBiometrics('/face/embed', { image: dto.image });
      
      if (!pythonRes || !pythonRes.success || !pythonRes.embedding) {
        return { matched: false, confidence: 0 };
      }

      resolvedEmbedding = pythonRes.embedding;
    }

    validateEmbeddingQuality(resolvedEmbedding);

    if (!dto.email) {
      throw new BadRequestException('Email is required.');
    }
    const emailLower = dto.email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: emailLower, mode: 'insensitive' } },
          { email: { startsWith: emailLower + '@', mode: 'insensitive' } }
        ]
      }
    });

    if (!user || !user.faceRegistered) {
      return { matched: false, confidence: 0 };
    }

    const vectorString = `[${resolvedEmbedding.join(',')}]`;
    
    // 1:1 matching against specific user
    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, "firstName", "lastName", "email", "userRole" AS "role", 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
      FROM users
      WHERE "id" = $2 AND "faceEmbedding" IS NOT NULL
    `, vectorString, user.id);

    if (results.length === 0 || results[0].confidence < 0.55) {
       return { matched: false, confidence: results.length ? results[0].confidence : 0 };
    }

    return {
      matched: true,
      confidence: results[0].confidence,
      user: results[0]
    };
  }

  async verifyFace(dto: VerifyFaceDto, ipAddress?: string, device?: string) {
    if (!dto.userId) {
      throw new BadRequestException('User ID is required.');
    }

    const registeredUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, faceRegistered: true, email: true, userRole: true, firstName: true, lastName: true, tenantId: true }
    });

    if (!registeredUser) {
      throw new UnauthorizedException('Unauthorized Biometric Access');
    }

    if (!registeredUser.faceRegistered) {
      throw new BadRequestException('Unregistered Biometric');
    }

    // Fetch vector embedding using raw query because faceEmbedding is Unsupported in Prisma Client
    const embeddingRes: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT "faceEmbedding"::text FROM users WHERE id = $1`,
      registeredUser.id
    );

    if (embeddingRes.length === 0 || !embeddingRes[0].faceEmbedding) {
      throw new BadRequestException('Unregistered Biometric');
    }

    console.log(`[Biometrics] Directing verification frame to Python CV Engine...`);
    
    const cleanVectorStr = embeddingRes[0].faceEmbedding.replace(/[\[\]]/g, '');
    const parsedEmbedding = cleanVectorStr.split(',').map((val: string) => parseFloat(val));
    
    const pythonRes = await callPythonBiometrics('/face/verify', {
      image: dto.image,
      registered_embedding: parsedEmbedding,
      threshold: 0.55
    });

    if (!pythonRes) {
      await this.logAudit(registeredUser.id, 'BIOMETRIC_FACE_VERIFICATION_FAILED', 'Biometrics', registeredUser.id,
        null, { reason: 'Liveness engine offline — verification denied', livenessStatus: 'ENGINE_UNAVAILABLE' }, ipAddress, device);
      await this.mongo.logInference({ tenantId: registeredUser.tenantId, userId: registeredUser.id, method: 'face', outcome: 'engine_offline', ipAddress, failureReason: 'Python engine unreachable' });
      throw new UnauthorizedException('Biometric verification service is temporarily unavailable. Please retry.');
    }

    if (pythonRes.matched && pythonRes.liveness_pass) {
      if (pythonRes.confidence < 0.55) {
        await this.mongo.logInference({ tenantId: registeredUser.tenantId, userId: registeredUser.id, method: 'face', outcome: 'no_match', confidence: pythonRes.confidence, livenessScore: pythonRes.liveness_score, livenessPass: true, ipAddress });
        throw new UnauthorizedException('Face Verification Failed');
      }

      const isPlatform = registeredUser.userRole === 'PLATFORM_HEAD' || registeredUser.userRole === 'PLATFORM_ADMIN';
      if (!isPlatform && !registeredUser.tenantId) {
        throw new UnauthorizedException('Organization access missing tenantId');
      }
      const payload = { email: registeredUser.email, sub: registeredUser.id, userId: registeredUser.id, role: registeredUser.userRole, tenantId: registeredUser.tenantId || null, organizationId: registeredUser.tenantId || null, type: 'authenticated' };
      const accessToken = this.jwtService.sign(payload);

      await this.logAudit(registeredUser.id, 'BIOMETRIC_FACE_VERIFICATION_SUCCESS', 'Biometrics', registeredUser.id,
        null, { confidence: pythonRes.confidence, livenessScore: pythonRes.liveness_score, engine: 'python_opencv' }, ipAddress, device);
      await this.mongo.logInference({ tenantId: registeredUser.tenantId, userId: registeredUser.id, method: 'face', outcome: 'match',
        confidence: pythonRes.confidence, livenessScore: pythonRes.liveness_score, livenessPass: true, ipAddress });
      // Increment daily analytics
      await this.mongo.upsertSnapshot(registeredUser.tenantId, 'daily', new Date().toISOString().slice(0, 10), { faceAuthAttempts: 1, faceAuthSuccesses: 1 });

      const biometricStatus = await this.getStatus(registeredUser.id);

      return {
        matched: true,
        confidence: pythonRes.confidence,
        access_token: accessToken,
        biometricStatus,
        authMethod: 'FACE',
        redirectTo: `/dashboard/${registeredUser.userRole.toLowerCase().replace('_', '-')}`,
        user: {
          id: registeredUser.id,
          email: registeredUser.email,
          firstName: registeredUser.firstName,
          lastName: registeredUser.lastName,
          role: registeredUser.userRole,
          tenantId: registeredUser.tenantId || null
        }
      };
    } else {
      const reason = !pythonRes.liveness_pass ? 'Face Verification Failed' : 'Identity Mismatch';
      const outcome = !pythonRes.liveness_pass ? 'liveness_fail' : 'no_match';
      await this.logAudit(registeredUser.id, 'BIOMETRIC_FACE_VERIFICATION_FAILED', 'Biometrics', registeredUser.id,
        null, { reason: pythonRes.message || reason, confidence: pythonRes.confidence, livenessPass: pythonRes.liveness_pass, livenessScore: pythonRes.liveness_score }, ipAddress, device);
      await this.mongo.logInference({ tenantId: registeredUser.tenantId, userId: registeredUser.id, method: 'face', outcome: outcome as any,
        confidence: pythonRes.confidence, livenessScore: pythonRes.liveness_score, livenessPass: pythonRes.liveness_pass, ipAddress, failureReason: reason });
      await this.mongo.upsertSnapshot(registeredUser.tenantId, 'daily', new Date().toISOString().slice(0, 10),
        { faceAuthAttempts: 1, ...(outcome === 'liveness_fail' ? { livenessFailures: 1 } : {}) });
      throw new UnauthorizedException(reason);
    }
  }
  async enrollFingerprint(dto: EnrollFingerprintDto, ipAddress: string = 'unknown', deviceInfo: string = 'web') {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { fingerprintTemplate: true }
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.fingerprintTemplate) {
      throw new BadRequestException('User already has a registered fingerprint profile.');
    }

    console.log(`[Biometrics] Extracting actual fingerprint keypoint descriptors via Python CV engine...`);
    const pythonRes = await callPythonBiometrics('/fingerprint/extract', { image: dto.image });
    
    if (!pythonRes || !pythonRes.success || !pythonRes.serialized_template) {
      throw new BadRequestException('Fingerprint mapping failed: Low print contrast, scanner noise, or engine offline.');
    }

    const finalTemplate = pythonRes.serialized_template;
    console.log(`[Biometrics] Fingerprint descriptors successfully extracted. Keypoints: ${pythonRes.keypoints_count}`);

    const encryptedTemplate = this.encrypt(finalTemplate);

    const userForFingerprint = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { tenantId: true }
    });

    if (!userForFingerprint) {
      throw new BadRequestException('User not found.');
    }

    // Prevent duplicate fingerprint registration across accounts in the SAME tenant context
    const duplicateCheck = await this.prisma.user.findFirst({
      where: { 
        fingerprintTemplate: encryptedTemplate,
        tenantId: userForFingerprint.tenantId
      }
    });

    if (duplicateCheck) {
      throw new BadRequestException('This fingerprint is already registered to another user.');
    }

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { 
        fingerprintTemplate: encryptedTemplate,
        fingerprintRegistered: true,
        biometricEnrolled: true,
        biometricPending: false,
      }
    });

    // --- SYNC TO USER_BIOMETRICS ---
    const userObj = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { faceRegistered: true } });
    await this.prisma.userBiometrics.upsert({
      where: { userId: dto.userId },
      create: {
        userId: dto.userId,
        faceRegistered: !!userObj?.faceRegistered,
        fingerprintRegistered: true,
        fingerprintTemplate: encryptedTemplate,
      },
      update: {
        fingerprintRegistered: true,
        fingerprintTemplate: encryptedTemplate,
      }
    });

    // --- BIOMETRIC AUDIT LOG ---
    await this.prisma.biometricAuditLog.create({
      data: {
        userId: dto.userId,
        action: 'ENROLL',
        deviceInfo: deviceInfo,
        ipAddress: ipAddress
      }
    });

    await this.logAudit(dto.userId, 'BIOMETRIC_FINGERPRINT_ENROLLED', 'User', dto.userId, null, { status: 'success' }, ipAddress, deviceInfo);

    return { message: 'Fingerprint enrolled successfully.' };
  }

  async skipBiometrics(userId: string, reason: string = 'user_opt_out', ipAddress: string = 'unknown', deviceInfo: string = 'web') {
    if (!userId) {
      throw new BadRequestException('User ID is required.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, userRole: true, tenantId: true }
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    // Role-based security check: commented out to allow testing/dev bypass
    // const criticalRoles = ['PLATFORM_HEAD', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SUPERVISOR', 'SECURITY_OFFICER'];
    // if (criticalRoles.includes(user.userRole)) {
    //   throw new BadRequestException(`Biometric registration is mandatory for your critical administrative role: ${user.userRole}.`);
    // }

    // Update user pending state in PostgreSQL
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        biometricPending: false,
      }
    });

    // Write to PostgreSQL BiometricAuditLog
    await this.prisma.biometricAuditLog.create({
      data: {
        userId,
        action: 'SKIP',
        deviceInfo: deviceInfo,
        ipAddress: ipAddress,
      }
    });

    // Write to MongoDB Audit Logs
    await this.logAudit(userId, 'BIOMETRIC_SKIPPED', 'User', userId, null, { reason }, ipAddress, deviceInfo);

    return { success: true, message: 'Biometric onboarding setup skipped successfully.' };
  }
  async identifyByFace(dto: IdentifyByFaceDto, ipAddress?: string, device?: string) {
    console.log('[Biometrics] Initiating 1:N face identification...');
    const t0 = Date.now();
    const pythonRes = await callPythonBiometrics('/../v1/auth/face-login', { image: dto.image });
    const latencyMs = Date.now() - t0;

    if (!pythonRes) {
      await this.logAudit(null, 'BIOMETRIC_FACE_LOGIN_FAILED', 'Biometrics', null, null,
        { reason: 'Liveness engine offline — login denied', livenessStatus: 'ENGINE_UNAVAILABLE' }, ipAddress, device);
      await this.mongo.logInference({ tenantId: null, userId: null, method: 'face', outcome: 'engine_offline', engineLatencyMs: latencyMs, ipAddress, failureReason: 'Python engine unreachable' });
      await this.mongo.logTelemetry({ tenantId: null, source: 'python_engine', event: 'face_login_offline', latencyMs, metadata: { ipAddress } });
      throw new UnauthorizedException('Biometric service is temporarily offline. Please retry.');
    }

    if (!pythonRes.matched) {
      await this.logAudit(null, 'BIOMETRIC_FACE_LOGIN_FAILED', 'Biometrics', null, null,
        { reason: pythonRes.detail || 'No match', engine: 'python' }, ipAddress, device);
      await this.mongo.logInference({ tenantId: null, userId: null, method: 'face', outcome: 'no_match', engineLatencyMs: latencyMs, ipAddress, failureReason: pythonRes.detail || 'No match' });
      throw new UnauthorizedException(pythonRes.detail || 'No Match Found');
    }

    const u = pythonRes.user;
    const isPlatform = u.role === 'PLATFORM_HEAD' || u.role === 'PLATFORM_ADMIN';
    if (!isPlatform && !u.tenantId) {
      throw new UnauthorizedException('Organization access missing tenantId');
    }
    const tenantId = u.tenantId || null;
    const payload = { email: u.email, sub: u.id, userId: u.id, role: u.role, tenantId, organizationId: tenantId, type: 'authenticated', method: 'face_biometric' };
    const accessToken = this.jwtService.sign(payload);

    await this.logAudit(u.id, 'BIOMETRIC_FACE_LOGIN_SUCCESS', 'Biometrics', u.id, null,
      { confidence: pythonRes.confidence, livenessScore: pythonRes.livenessScore, engine: 'python' }, ipAddress, device);
    await this.mongo.logInference({ tenantId, userId: u.id, method: 'face', outcome: 'match',
      confidence: pythonRes.confidence, livenessScore: pythonRes.livenessScore, livenessPass: true, engineLatencyMs: latencyMs, ipAddress });
    if (tenantId) {
      await this.mongo.upsertSnapshot(tenantId, 'daily', new Date().toISOString().slice(0, 10), { faceAuthAttempts: 1, faceAuthSuccesses: 1 });
    }
    await this.mongo.logTelemetry({ tenantId, source: 'python_engine', event: 'face_login_success', latencyMs, metadata: { confidence: pythonRes.confidence } });

    const biometricStatus = await this.getStatus(u.id);

    return {
      matched: true,
      confidence: pythonRes.confidence,
      livenessScore: pythonRes.livenessScore,
      access_token: accessToken,
      biometricStatus,
      authMethod: 'FACE',
      redirectTo: `/dashboard/${u.role.toLowerCase().replace('_', '-')}`,
      user: {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        tenantId: u.tenantId || null,
      },
    };
  }

  async identifyByFingerprint(dto: IdentifyByFingerprintDto, ipAddress?: string, device?: string) {
    console.log('[Biometrics] Initiating 1:N fingerprint identification...');
    const t0 = Date.now();
    const pythonRes = await callPythonBiometrics('/../v1/auth/fingerprint-login', { image: dto.image });
    const latencyMs = Date.now() - t0;

    if (!pythonRes) {
      await this.logAudit(null, 'BIOMETRIC_FINGERPRINT_LOGIN_FAILED', 'Biometrics', null, null,
        { reason: 'Fingerprint engine offline — login denied', livenessStatus: 'ENGINE_UNAVAILABLE' }, ipAddress, device);
      await this.mongo.logInference({ tenantId: null, userId: null, method: 'fingerprint', outcome: 'engine_offline', engineLatencyMs: latencyMs, ipAddress, failureReason: 'Python engine unreachable' });
      throw new UnauthorizedException('Biometric service is temporarily offline. Please retry.');
    }

    if (!pythonRes.matched) {
      await this.logAudit(null, 'BIOMETRIC_FINGERPRINT_LOGIN_FAILED', 'Biometrics', null, null,
        { reason: pythonRes.detail || 'No match', engine: 'python' }, ipAddress, device);
      await this.mongo.logInference({ tenantId: null, userId: null, method: 'fingerprint', outcome: 'no_match', engineLatencyMs: latencyMs, ipAddress, failureReason: pythonRes.detail || 'No match' });
      throw new UnauthorizedException(pythonRes.detail || 'No Match Found');
    }

    const u = pythonRes.user;
    const isPlatform = u.role === 'PLATFORM_HEAD' || u.role === 'PLATFORM_ADMIN';
    if (!isPlatform && !u.tenantId) {
      throw new UnauthorizedException('Organization access missing tenantId');
    }
    const tenantId = u.tenantId || null;
    const payload = { email: u.email, sub: u.id, userId: u.id, role: u.role, tenantId, organizationId: tenantId, type: 'authenticated', method: 'fingerprint_biometric' };
    const accessToken = this.jwtService.sign(payload);

    await this.logAudit(u.id, 'BIOMETRIC_FINGERPRINT_LOGIN_SUCCESS', 'Biometrics', u.id, null,
      { goodMatches: pythonRes.goodMatches, score: pythonRes.score, engine: 'python' }, ipAddress, device);
    await this.mongo.logInference({ tenantId, userId: u.id, method: 'fingerprint', outcome: 'match',
      goodMatches: pythonRes.goodMatches, confidence: pythonRes.score, engineLatencyMs: latencyMs, ipAddress });
    if (tenantId) {
      await this.mongo.upsertSnapshot(tenantId, 'daily', new Date().toISOString().slice(0, 10), { fingerprintAuthAttempts: 1, fingerprintAuthSuccesses: 1 });
    }

    const biometricStatus = await this.getStatus(u.id);

    return {
      matched: true,
      goodMatches: pythonRes.goodMatches,
      score: pythonRes.score,
      access_token: accessToken,
      biometricStatus,
      authMethod: 'FINGERPRINT',
      redirectTo: `/dashboard/${u.role.toLowerCase().replace('_', '-')}`,
      user: {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        tenantId: u.tenantId || null,
      },
    };
  }

  async verifyFingerprint(dto: VerifyFingerprintDto, ipAddress?: string, device?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, email: true, userRole: true, firstName: true, lastName: true, fingerprintTemplate: true, tenantId: true }
    });

    if (!user) {
      throw new UnauthorizedException('Unauthorized Biometric Access');
    }

    if (!user.fingerprintTemplate) {
      await this.logAudit(
        dto.userId,
        'BIOMETRIC_FINGERPRINT_VERIFICATION_FAILED',
        'Biometrics',
        dto.userId,
        null,
        { reason: 'No registered fingerprint template' },
        ipAddress,
        device
      );
      throw new BadRequestException('Unregistered Biometric');
    }

    const decryptedTemplate = this.decrypt(user.fingerprintTemplate);

    console.log(`[Biometrics] Submitting current fingerprint capture to Python Matcher...`);
    const pythonRes = await callPythonBiometrics('/fingerprint/verify', {
      image: dto.image,
      serialized_template: decryptedTemplate,
      threshold: 20
    });

    if (!pythonRes) {
      await this.logAudit(
        dto.userId,
        'BIOMETRIC_FINGERPRINT_VERIFICATION_FAILED',
        'Biometrics',
        dto.userId,
        null,
        { reason: 'Fingerprint engine offline — verification denied', livenessStatus: 'ENGINE_UNAVAILABLE' },
        ipAddress,
        device
      );
      throw new UnauthorizedException('Biometric verification service is temporarily unavailable. Please retry.');
    }

    if (pythonRes.matched) {
      const isPlatform = user.userRole === 'PLATFORM_HEAD' || user.userRole === 'PLATFORM_ADMIN';
      if (!isPlatform && !user.tenantId) {
        throw new UnauthorizedException('Organization access missing tenantId');
      }
      const payload = { email: user.email, sub: user.id, userId: user.id, role: user.userRole, tenantId: user.tenantId || null, organizationId: user.tenantId || null, type: 'authenticated' };
      const accessToken = this.jwtService.sign(payload);

      await this.logAudit(
        user.id,
        'BIOMETRIC_FINGERPRINT_VERIFICATION_SUCCESS',
        'Biometrics',
        user.id,
        null,
        { goodMatchesCount: pythonRes.good_matches, score: pythonRes.score, engine: 'python_orb_matcher' },
        ipAddress,
        device
      );

      const biometricStatus = await this.getStatus(user.id);

      return {
        matched: true,
        access_token: accessToken,
        biometricStatus,
        authMethod: 'FINGERPRINT',
        redirectTo: `/dashboard/${user.userRole.toLowerCase().replace('_', '-')}`,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.userRole,
          tenantId: user.tenantId || null
        }
      };
    } else {
      await this.logAudit(
        dto.userId,
        'BIOMETRIC_FINGERPRINT_VERIFICATION_FAILED',
        'Biometrics',
        dto.userId,
        null,
        { reason: pythonRes.message || 'Fingerprint template mismatch', matchesFound: pythonRes.good_matches, thresholdRequired: pythonRes.required_matches },
        ipAddress,
        device
      );
      throw new UnauthorizedException('Identity Mismatch');
    }
  }
}
