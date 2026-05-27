import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollFaceDto, MatchFaceDto } from './biometrics.dto';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'fencein-secure-biometrics-fallback-key', 'salt', 32);
const IV = Buffer.alloc(16, 0); // constant IV for deterministic lookup

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedText: string): string {
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, IV);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encryptedText;
  }
}

function validateEmbeddingQuality(embedding: number[]) {
  if (!embedding || embedding.length !== 128) {
    throw new BadRequestException('Embedding must be exactly 128 dimensions.');
  }

  // Calculate mean
  const sum = embedding.reduce((a, b) => a + b, 0);
  const mean = sum / embedding.length;

  // Calculate variance to reject flat mock arrays (e.g. all 0.128 or 0)
  const variance = embedding.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / embedding.length;

  if (variance < 1e-4) {
    throw new BadRequestException('Bypass attempt detected: static or mock biometric embeddings are prohibited.');
  }
}

/**
 * Non-blocking internal fetch to the Python Computer Vision microservice.
 * Returns null if the service is unreachable or errors out, allowing dynamic fallback.
 */
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
    console.log(`[Biometrics] Python microservice is offline on port 8000. Operating in fallback mode. Error: ${err.message}`);
    return null;
  }
}

@Injectable()
export class BiometricsService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

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
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          oldValue: oldValue ?? undefined,
          newValue: newValue ?? undefined,
          ipAddress: ipAddress || 'unknown',
          device: device || 'unknown',
        },
      });
    } catch (err) {
      console.error('Failed to log audit event:', err);
    }
  }

  async enrollFace(dto: EnrollFaceDto) {
    let resolvedEmbedding: number[] | undefined = dto.embedding;

    // 1. Check if raw camera image is provided. If so, let Python extract the 128D embedding
    if (dto.image) {
      console.log(`[Biometrics] Delegating face embedding extraction to Python Engine...`);
      const pythonRes = await callPythonBiometrics('/face/embed', { image: dto.image });
      if (pythonRes && pythonRes.success && pythonRes.embedding) {
        resolvedEmbedding = pythonRes.embedding;
        console.log(`[Biometrics] Successfully extracted 128D embedding from Python. Liveness Score: ${pythonRes.liveness_score}`);
      } else {
        throw new BadRequestException('Biometric analysis failed: Face undetected or passive liveness test rejected.');
      }
    }

    if (!resolvedEmbedding) {
      throw new BadRequestException('Face embedding or raw camera image is mandatory for enrollment.');
    }

    validateEmbeddingQuality(resolvedEmbedding);
    
    // 2. Prevent re-registration for the same user
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { faceEmbedding: true }
    });
    
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    
    if (user.faceEmbedding) {
      throw new BadRequestException('User already has a registered biometric profile.');
    }
    
    const vectorString = `[${resolvedEmbedding.join(',')}]`;
    
    // 3. Prevent the same biometric data from being registered for more than one user
    const duplicateCheck: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
      FROM "User"
      WHERE "faceEmbedding" IS NOT NULL
      ORDER BY "faceEmbedding"::vector <=> $1::vector
      LIMIT 1;
    `, vectorString);

    if (duplicateCheck.length > 0 && duplicateCheck[0].confidence > 0.95) {
      throw new BadRequestException('This biometric data is already registered to another user.');
    }
    
    await this.prisma.$executeRawUnsafe(
      `UPDATE "User" SET "faceEmbedding" = $1::vector WHERE id = $2`, 
      vectorString, 
      dto.userId
    );

    await this.logAudit(dto.userId, 'BIOMETRIC_FACE_ENROLLED', 'User', dto.userId, null, { status: 'success' });

    return { message: 'Face enrolled successfully.' };
  }

  async matchFace(dto: MatchFaceDto) {
    let resolvedEmbedding: number[] | undefined = dto.embedding;

    // 1. If base64 image is passed, extract the embedding using Python
    if (dto.image) {
      const pythonRes = await callPythonBiometrics('/face/embed', { image: dto.image });
      if (pythonRes && pythonRes.success && pythonRes.embedding) {
        resolvedEmbedding = pythonRes.embedding;
      }
    }

    if (!resolvedEmbedding) {
      return { matched: false, confidence: 0 };
    }

    validateEmbeddingQuality(resolvedEmbedding);

    const emailLower = dto.email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: emailLower, mode: 'insensitive' } },
          { email: { startsWith: emailLower + '@', mode: 'insensitive' } }
        ]
      }
    });

    if (!user || !user.faceEmbedding) {
      return { matched: false, confidence: 0 };
    }

    const vectorString = `[${resolvedEmbedding.join(',')}]`;
    
    // 1:1 matching: Only compare against the specific resolved user
    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, "firstName", "lastName", "email", "role", 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
      FROM "User"
      WHERE "id" = $2 AND "faceEmbedding" IS NOT NULL
    `, vectorString, user.id);

    if (results.length === 0 || results[0].confidence < 0.78) {
       return { matched: false, confidence: results.length ? results[0].confidence : 0 };
    }

    return {
      matched: true,
      confidence: results[0].confidence,
      user: results[0]
    };
  }

  async verifyFace(dto: import('./biometrics.dto').VerifyFaceDto, ipAddress?: string, device?: string) {
    // 1. Query registered user profile first
    const registeredUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, faceEmbedding: true, email: true, role: true, firstName: true, lastName: true }
    });

    if (!registeredUser) {
      throw new UnauthorizedException('Unauthorized Biometric Access');
    }

    if (!registeredUser.faceEmbedding) {
      throw new BadRequestException('Unregistered Biometric');
    }

    // 2. Try Python Engine if a raw camera image is provided
    if (dto.image) {
      console.log(`[Biometrics] Directing verification frame and registered profile to Python CV Engine...`);
      
      // Parse the database float array from postgres vector
      const parsedEmbedding = registeredUser.faceEmbedding as any as number[];
      
      const pythonRes = await callPythonBiometrics('/face/verify', {
        image: dto.image,
        registered_embedding: parsedEmbedding,
        threshold: 0.78
      });

      // SECURITY: If image was provided but Python engine is unreachable, deny the request.
      // We MUST NOT fall through to embedding-only path when a liveness image was sent.
      if (!pythonRes) {
        await this.logAudit(
          dto.userId,
          'BIOMETRIC_FACE_VERIFICATION_FAILED',
          'Biometrics',
          dto.userId,
          null,
          { reason: 'Liveness engine offline — verification denied', livenessStatus: 'ENGINE_UNAVAILABLE' },
          ipAddress,
          device
        );
        throw new UnauthorizedException('Biometric verification service is temporarily unavailable. Please retry.');
      }

      if (pythonRes.matched && pythonRes.liveness_pass) {
          if (pythonRes.confidence < 0.78) {
            throw new UnauthorizedException('Face Verification Failed');
          }

          // Enforce issuing JWT token with type: 'authenticated' to unlock the API gateway
          const payload = { email: registeredUser.email, sub: registeredUser.id, role: registeredUser.role, type: 'authenticated' };
          const accessToken = this.jwtService.sign(payload);

          await this.logAudit(
            registeredUser.id,
            'BIOMETRIC_FACE_VERIFICATION_SUCCESS',
            'Biometrics',
            registeredUser.id,
            null,
            { confidence: pythonRes.confidence, livenessScore: pythonRes.liveness_score, engine: 'python_opencv' },
            ipAddress,
            device
          );

          return {
            matched: true,
            confidence: pythonRes.confidence,
            access_token: accessToken,
            user: {
              id: registeredUser.id,
              email: registeredUser.email,
              firstName: registeredUser.firstName,
              lastName: registeredUser.lastName,
              role: registeredUser.role
            }
          };
        } else {
          const reason = !pythonRes.liveness_pass ? 'Face Verification Failed' : 'Identity Mismatch';
          await this.logAudit(
            dto.userId,
            'BIOMETRIC_FACE_VERIFICATION_FAILED',
            'Biometrics',
            dto.userId,
            null,
            { reason: pythonRes.message || reason, confidence: pythonRes.confidence, livenessPass: pythonRes.liveness_pass, livenessScore: pythonRes.liveness_score },
            ipAddress,
            device
          );
          throw new UnauthorizedException(reason);
        }
    }

    // 3. Standard Fallback Flow
    try {
      if (!dto.embedding || dto.embedding.length !== 128) {
        throw new BadRequestException('Face Verification Failed');
      }
      validateEmbeddingQuality(dto.embedding);
    } catch (err: any) {
      await this.logAudit(
        dto.userId,
        'BIOMETRIC_FACE_VERIFICATION_FAILED',
        'Biometrics',
        dto.userId,
        null,
        { reason: err.message, confidence: 0, livenessStatus: 'FAILED' },
        ipAddress,
        device
      );
      throw new UnauthorizedException('Face Verification Failed');
    }

    const vectorString = `[${dto.embedding.join(',')}]`;
    
    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, "firstName", "lastName", "email", "role", 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
      FROM "User"
      WHERE id = $2 AND "faceEmbedding" IS NOT NULL
    `, vectorString, dto.userId);

    const confidence = results.length > 0 ? results[0].confidence : 0;

    if (results.length === 0 || confidence < 0.78) {
       await this.logAudit(
         dto.userId,
         'BIOMETRIC_FACE_VERIFICATION_FAILED',
         'Biometrics',
         dto.userId,
         null,
         { reason: 'Confidence score below threshold', confidence, threshold: 0.78 },
         ipAddress,
         device
       );
       throw new UnauthorizedException('Identity Mismatch');
    }

    const matchedUser = results[0];
    // Enforce issuing JWT token with type: 'authenticated'
    const payload = { email: matchedUser.email, sub: matchedUser.id, role: matchedUser.role, type: 'authenticated' };
    const accessToken = this.jwtService.sign(payload);

    await this.logAudit(
      matchedUser.id,
      'BIOMETRIC_FACE_VERIFICATION_SUCCESS',
      'Biometrics',
      matchedUser.id,
      null,
      { confidence, threshold: 0.78 },
      ipAddress,
      device
    );

    return {
      matched: true,
      confidence,
      access_token: accessToken,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        firstName: matchedUser.firstName,
        lastName: matchedUser.lastName,
        role: matchedUser.role
      }
    };
  }

  async enrollFingerprint(dto: import('./biometrics.dto').EnrollFingerprintDto) {
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

    let finalTemplate = dto.fingerprintTemplate.trim();

    // 1. Try Python Engine to extract true ORB ridge features if base64 image is uploaded
    if (dto.image) {
      console.log(`[Biometrics] Extracting actual fingerprint keypoint descriptors via Python CV engine...`);
      const pythonRes = await callPythonBiometrics('/fingerprint/extract', { image: dto.image });
      if (pythonRes && pythonRes.success && pythonRes.serialized_template) {
        finalTemplate = pythonRes.serialized_template;
        console.log(`[Biometrics] Fingerprint descriptors successfully extracted. Keypoints: ${pythonRes.keypoints_count}`);
      } else {
        throw new BadRequestException('Fingerprint mapping failed. Low print contrast or scanner noise.');
      }
    }

    const encryptedTemplate = encrypt(finalTemplate);

    // Prevent duplicate fingerprint registrations across multiple accounts
    const duplicateCheck = await this.prisma.user.findFirst({
      where: { fingerprintTemplate: encryptedTemplate }
    });

    if (duplicateCheck) {
      throw new BadRequestException('This fingerprint is already registered to another user.');
    }

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { fingerprintTemplate: encryptedTemplate }
    });

    await this.logAudit(dto.userId, 'BIOMETRIC_FINGERPRINT_ENROLLED', 'User', dto.userId, null, { status: 'success' });

    return { message: 'Fingerprint enrolled successfully.' };
  }

  async verifyFingerprint(dto: import('./biometrics.dto').VerifyFingerprintDto, ipAddress?: string, device?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, fingerprintTemplate: true }
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

    const decryptedTemplate = decrypt(user.fingerprintTemplate);

    // 1. Try Python Engine if a base64 fingerprint image is uploaded
    if (dto.image) {
      console.log(`[Biometrics] Submitting current fingerprint capture and profile descriptors to Python Matcher...`);
      const pythonRes = await callPythonBiometrics('/fingerprint/verify', {
        image: dto.image,
        serialized_template: decryptedTemplate,
        threshold: 18
      });

      if (pythonRes) {
        if (pythonRes.matched) {
          // Enforce type: 'authenticated'
          const payload = { email: user.email, sub: user.id, role: user.role, type: 'authenticated' };
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

          return {
            matched: true,
            access_token: accessToken,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role
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

    // 2. Standard Fallback Flow (String comparison)
    const matched = decryptedTemplate.trim() === dto.fingerprintTemplate.trim();

    if (!matched) {
      await this.logAudit(
        dto.userId,
        'BIOMETRIC_FINGERPRINT_VERIFICATION_FAILED',
        'Biometrics',
        dto.userId,
        null,
        { reason: 'Fingerprint template mismatch' },
        ipAddress,
        device
      );
      throw new UnauthorizedException('Identity Mismatch');
    }

    // Successful fingerprint verification: issue the FINAL session token signed with type: 'authenticated'
    const payload = { email: user.email, sub: user.id, role: user.role, type: 'authenticated' };
    const accessToken = this.jwtService.sign(payload);

    await this.logAudit(
      user.id,
      'BIOMETRIC_FINGERPRINT_VERIFICATION_SUCCESS',
      'Biometrics',
      user.id,
      null,
      { status: 'success' },
      ipAddress,
      device
    );

    return {
      matched: true,
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    };
  }
}
