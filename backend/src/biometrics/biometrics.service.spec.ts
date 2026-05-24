import { Test, TestingModule } from '@nestjs/testing';
import { BiometricsService } from './biometrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('BiometricsService', () => {
  let service: BiometricsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Create a mock PrismaService
    const mockPrismaService = {
      $executeRawUnsafe: jest.fn(),
      $queryRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BiometricsService>(BiometricsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enrollFace', () => {
    it('should throw BadRequestException if embedding is not 128 dimensions', async () => {
      const invalidDto = {
        userId: 'user-123',
        embedding: new Array(100).fill(0), // 100 dims instead of 128
      };

      await expect(service.enrollFace(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.enrollFace(invalidDto)).rejects.toThrow('Embedding must be exactly 128 dimensions.');
    });

    it('should enroll face successfully with valid 128 dim embedding', async () => {
      const validDto = {
        userId: 'user-123',
        embedding: new Array(128).fill(0.5),
      };

      (prisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(1);

      const result = await service.enrollFace(validDto);
      expect(result).toEqual({ message: 'Face enrolled successfully.' });
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'user-123'
      );
    });
  });

  describe('matchFace', () => {
    it('should throw BadRequestException if embedding is not 128 dimensions', async () => {
      const invalidDto = {
        embedding: new Array(50).fill(0.1),
      };

      await expect(service.matchFace(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should return matched: false if confidence is below threshold', async () => {
      const validDto = {
        embedding: new Array(128).fill(0.2),
      };

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        { id: 'user-1', confidence: 0.80 }, // Below 0.85 threshold
      ]);

      const result = await service.matchFace(validDto);
      expect(result).toEqual({ matched: false, confidence: 0.80 });
    });

    it('should return matched: true if confidence is above threshold', async () => {
      const validDto = {
        embedding: new Array(128).fill(0.2),
      };

      const matchedUser = { 
        id: 'user-1', 
        firstName: 'John', 
        lastName: 'Doe', 
        email: 'john@example.com', 
        role: 'WORKER', 
        confidence: 0.95 
      };

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([matchedUser]);

      const result = await service.matchFace(validDto);
      expect(result).toEqual({
        matched: true,
        confidence: 0.95,
        user: matchedUser,
      });
    });

    it('should return matched: false if no results found', async () => {
      const validDto = {
        embedding: new Array(128).fill(0.2),
      };

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);

      const result = await service.matchFace(validDto);
      expect(result).toEqual({ matched: false, confidence: 0 });
    });
  });
});
