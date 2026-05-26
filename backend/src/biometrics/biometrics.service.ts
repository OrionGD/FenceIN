import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollFaceDto, MatchFaceDto } from './biometrics.dto';
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

@Injectable()
export class BiometricsService {
  constructor(private prisma: PrismaService) {}

  async enrollFace(dto: EnrollFaceDto) {
    if (dto.embedding.length !== 128) {
      throw new BadRequestException('Embedding must be exactly 128 dimensions.');
    }
    
    // 1. Prevent re-registration for the same user
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
    
    const vectorString = `[${dto.embedding.join(',')}]`;
    
    // 2. Prevent the same biometric data from being registered for more than one user
    const duplicateCheck: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
      FROM "User"
      WHERE "faceEmbedding" IS NOT NULL
      ORDER BY "faceEmbedding"::vector <=> $1::vector
      LIMIT 1;
    `, vectorString);

    if (duplicateCheck.length > 0 && duplicateCheck[0].confidence > 0.90) {
      throw new BadRequestException('This biometric data is already registered to another user.');
    }
    
    await this.prisma.$executeRawUnsafe(
      `UPDATE "User" SET "faceEmbedding" = $1::vector WHERE id = $2`, 
      vectorString, 
      dto.userId
    );

    return { message: 'Face enrolled successfully.' };
  }

  async matchFace(dto: import('./biometrics.dto').MatchFaceDto) {
    if (dto.embedding.length !== 128) {
      throw new BadRequestException('Embedding must be exactly 128 dimensions.');
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

    if (!user || !user.faceEmbedding) {
      return { matched: false, confidence: 0 };
    }

    const vectorString = `[${dto.embedding.join(',')}]`;
    
    // 1:1 matching: Only compare against the specific resolved user
    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, "firstName", "lastName", "email", "role", 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
      FROM "User"
      WHERE "id" = $2 AND "faceEmbedding" IS NOT NULL
    `, vectorString, user.id);

    if (results.length === 0 || results[0].confidence < 0.90) {
       return { matched: false, confidence: results.length ? results[0].confidence : 0 };
    }

    return {
      matched: true,
      confidence: results[0].confidence,
      user: results[0]
    };
  }

  async verifyFace(dto: import('./biometrics.dto').VerifyFaceDto) {
    if (dto.embedding.length !== 128) {
      throw new BadRequestException('Embedding must be exactly 128 dimensions.');
    }

    const vectorString = `[${dto.embedding.join(',')}]`;
    
    // 1:1 Matching bounded specifically to the user ID
    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, "firstName", "lastName", "email", "role", 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
      FROM "User"
      WHERE id = $2 AND "faceEmbedding" IS NOT NULL
    `, vectorString, dto.userId);

    if (results.length === 0 || results[0].confidence < 0.90) {
       return { matched: false, confidence: results.length ? results[0].confidence : 0 };
    }

    return {
      matched: true,
      confidence: results[0].confidence,
      user: results[0]
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

    const encryptedTemplate = encrypt(dto.fingerprintTemplate.trim());

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

    return { message: 'Fingerprint enrolled successfully.' };
  }

  async verifyFingerprint(dto: import('./biometrics.dto').VerifyFingerprintDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { fingerprintTemplate: true }
    });

    if (!user || !user.fingerprintTemplate) {
      return { matched: false };
    }

    const decryptedTemplate = decrypt(user.fingerprintTemplate);
    const matched = decryptedTemplate.trim() === dto.fingerprintTemplate.trim();

    return { matched };
  }
}
