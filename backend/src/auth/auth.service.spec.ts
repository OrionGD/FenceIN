import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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
      create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
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
      const mockUser = { id: '1', email: 'test@test.com', role: 'WORKER' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      (jwtService.sign as jest.Mock).mockReturnValue('mockJwtToken');

      const result = await service.login({ email: 'test@test.com', password: 'password' });

      expect(result).toEqual({
        access_token: 'mockJwtToken',
        user: { email: 'test@test.com', sub: '1', role: 'WORKER' },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({ email: 'test@test.com', sub: '1', role: 'WORKER' });
    });
  });

  describe('register', () => {
    it('should hash password and create user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      const mockCreatedUser = { id: '1', email: 'new@test.com', password: 'hashedPassword123', firstName: 'New', lastName: 'User', role: 'WORKER' };
      (usersService.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      const registerDto = { email: 'new@test.com', password: 'password123', firstName: 'New', lastName: 'User' };
      
      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersService.create).toHaveBeenCalledWith({ ...registerDto, password: 'hashedPassword123' });
      expect(result).toEqual({ id: '1', email: 'new@test.com', firstName: 'New', lastName: 'User', role: 'WORKER' });
    });
  });
});
