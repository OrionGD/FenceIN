import { Test, TestingModule } from '@nestjs/testing';
import { BiometricsService } from './biometrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { MongoService } from '../mongo/mongo.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

describe('BiometricsService', () => {
  let service: BiometricsService;
  let prisma: PrismaService;

  const mockMongoService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
    logInference: jest.fn().mockResolvedValue(undefined),
    upsertSnapshot: jest.fn().mockResolvedValue(undefined),
    logTelemetry: jest.fn().mockResolvedValue(undefined),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-secret-key-that-is-at-least-32-characters-long'),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $executeRawUnsafe: jest.fn(),
      $queryRawUnsafe: jest.fn(),
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MongoService, useValue: mockMongoService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BiometricsService>(BiometricsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enrollFace', () => {
    it('should delegate face embedding extraction to Python engine (offline → BadRequestException)', async () => {
      // When Python engine is offline, enrollFace should throw
      const dto = { userId: 'user-123', image: 'base64data' };
      await expect(service.enrollFace(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject enrollment when another account already has the same registered face', async () => {
      const dto = { userId: 'user-123', image: 'data:image/png;base64,mock' };
      const mockEmbedding = new Array(512).fill(0.1);
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, embedding: mockEmbedding, liveness_score: 0.95 }),
      } as any) as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ faceRegistered: false, tenantId: 'tenant-1' });
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ id: 'existing-user', confidence: 0.86 }]);

      await expect(service.enrollFace(dto)).rejects.toThrow(BadRequestException);

      global.fetch = originalFetch;
    });
  });

  describe('matchFace', () => {
    it('should return matched: false when Python engine is offline', async () => {
      const dto = { email: 'test@example.com', image: 'base64data' };
      // Python engine will be offline in test — matchFace returns { matched: false, confidence: 0 }
      const result = await service.matchFace(dto);
      expect(result).toMatchObject({ matched: false });
    });
  });
});
