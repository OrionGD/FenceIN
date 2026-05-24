import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollFaceDto, MatchFaceDto } from './biometrics.dto';

@Injectable()
export class BiometricsService {
  constructor(private prisma: PrismaService) {}

  async enrollFace(dto: EnrollFaceDto) {
    if (dto.embedding.length !== 128) {
      throw new BadRequestException('Embedding must be exactly 128 dimensions.');
    }
    
    const vectorString = `[${dto.embedding.join(',')}]`;
    
    await this.prisma.$executeRawUnsafe(
      `UPDATE "User" SET "faceEmbedding" = $1::vector WHERE id = $2`, 
      vectorString, 
      dto.userId
    );

    return { message: 'Face enrolled successfully.' };
  }

  async matchFace(dto: MatchFaceDto) {
    if (dto.embedding.length !== 128) {
      throw new BadRequestException('Embedding must be exactly 128 dimensions.');
    }

    const vectorString = `[${dto.embedding.join(',')}]`;
    
    // Cosine distance matching: <=>
    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, "firstName", "lastName", "email", "role", 1 - ("faceEmbedding" <=> $1::vector) AS confidence
      FROM "User"
      WHERE "faceEmbedding" IS NOT NULL
      ORDER BY "faceEmbedding" <=> $1::vector
      LIMIT 1;
    `, vectorString);

    if (results.length === 0 || results[0].confidence < 0.85) {
       return { matched: false, confidence: results.length ? results[0].confidence : 0 };
    }

    return {
      matched: true,
      confidence: results[0].confidence,
      user: results[0]
    };
  }
}
