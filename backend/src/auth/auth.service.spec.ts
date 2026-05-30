import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MongoService } from '../mongo/mongo.service';
import { BiometricsService } from '../biometrics/biometrics.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { ConfigService } from '@nestjs/config';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockPrismaService = {
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ tenantId: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };

    const mockMongoService = {
      logAudit: jest.fn().mockResolvedValue({}),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('mock-secret-key-that-is-at-least-32-characters-long'),
    };

    const mockBiometricsService = {
      getStatus: jest.fn().mockResolvedValue({ face: false, fingerprint: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MongoService, useValue: mockMongoService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BiometricsService, useValue: mockBiometricsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      const mockUser = { id: '1', email: 'test@test.com', password: 'hashedPassword', role: 'WORKER' };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password');

      expect(result).toEqual({ id: '1', email: 'test@test.com', role: 'WORKER' });
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@test.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('should return null if user is not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('test@test.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      const mockUser = { id: '1', email: 'test@test.com', password: 'hashedPassword', role: 'WORKER' };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user validation fails', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login({ email: 'test@test.com', password: 'password' })).rejects.toThrow(UnauthorizedException);
    });

    it('should return access token and user payload if validation succeeds', async () => {
      const mockUser = { 
        id: '1', 
        email: 'test@test.com', 
        role: 'WORKER', 
        tenantId: 'ORG001',
        isActive: true, 
        state: 'ACTIVE',
        faceRegistered: true,
        fingerprintRegistered: false,
        faceEmbedding: new Array(512).fill(0.1) 
      };
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      (jwtService.sign as jest.Mock).mockReturnValue('mockJwtToken');

      const result = await service.login({ email: 'test@test.com', password: 'password' });

      expect(result).toEqual({
        success: true,
        access_token: 'mockJwtToken',
        biometricStatus: { face: false, fingerprint: false },
        biometricRequired: false,
        biometricPending: true,
        redirectTo: '/biometric-setup',
        user: {
          id: '1',
          email: 'test@test.com',
          firstName: undefined,
          lastName: undefined,
          role: 'WORKER',
          tenantId: 'ORG001',
          state: 'ACTIVE',
          mustChangePassword: undefined,
          faceEnrolled: false,
          fingerprintEnrolled: false,
        },
      });
    });
  });

  describe('register', () => {
    it('should hash password and create user', async () => {
      const mockPythonRes = {
        success: true,
        embedding: new Array(512).fill(0.1),
        liveness_score: 0.95
      };
      const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPythonRes),
        } as any)
      );

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      const mockCreatedUser = { id: '1', email: 'new@test.com', password: 'hashedPassword123', firstName: 'New', lastName: 'User', role: 'WORKER' };
      (usersService.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      const registerDto = { 
        email: 'new@test.com', 
        password: 'Password123', 
        firstName: 'New', 
        lastName: 'User',
        faceImage: 'data:image/jpeg;base64,mock',
        role: 'WORKER' as any
      };
      
      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(usersService.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new@test.com',
        password: 'hashedPassword123',
        firstName: 'New',
        lastName: 'User',
        userRole: 'WORKER',
        vendor: undefined,
      }));
      expect(result).toEqual({ id: '1', email: 'new@test.com', firstName: 'New', lastName: 'User', role: 'WORKER' });

      fetchSpy.mockRestore();
    });

    it('should reject registration when the same face is already registered to another user', async () => {
      const mockPythonRes = {
        success: true,
        embedding: new Array(512).fill(0.1),
        liveness_score: 0.95,
      };
      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPythonRes),
      } as any);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (service['prisma'].$queryRawUnsafe as jest.Mock).mockResolvedValue([{ id: 'existing-user', confidence: 0.88 }]);

      const registerDto = {
        email: 'new@test.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
        faceImage: 'data:image/jpeg;base64,mock',
        role: 'WORKER' as any,
      };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      fetchSpy.mockRestore();
    });
  });
});
