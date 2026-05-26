import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { BiometricRequiredException } from './exception/biometric-required.exception';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, ChangePasswordDto } from './auth.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'fencein-secure-biometrics-fallback-key', 'salt', 32);
const IV = Buffer.alloc(16, 0);

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user: any = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      // Audit failed login attempt
      await this.logAudit(null, 'LOGIN_FAILED', 'User', null, null, { email: loginDto.email, reason: 'Invalid credentials' });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user account is active
    if (!user.isActive) {
      await this.logAudit(user.id, 'LOGIN_BLOCKED', 'User', user.id, null, { reason: 'Account deactivated' });
      throw new ForbiddenException('Account has been deactivated. Contact your administrator.');
    }

    // Check if user is suspended/terminated/blacklisted
    if (['SUSPENDED', 'TERMINATED', 'BLACKLISTED'].includes(user.state)) {
      await this.logAudit(user.id, 'LOGIN_BLOCKED', 'User', user.id, null, { reason: `Account state: ${user.state}` });
      throw new ForbiddenException(`Account is ${user.state.toLowerCase()}. Contact your administrator.`);
    }

    if (!user.faceEmbedding && !user.fingerprintTemplate) {
      throw new BiometricRequiredException('Biometric enrollment required');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    // Audit successful login
    await this.logAudit(user.id, 'LOGIN_SUCCESS', 'User', user.id, null, { method: 'credentials', mustChangePassword: user.mustChangePassword });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        state: user.state,
        mustChangePassword: user.mustChangePassword,
        biometricEnrolled: !!user.faceEmbedding || !!user.fingerprintTemplate,
        faceEnrolled: !!user.faceEmbedding,
        fingerprintEnrolled: !!user.fingerprintTemplate,
        faceEmbedding: user.faceEmbedding,
      },
    };
  }

  async biometricLogin(email: string) {
    const user: any = await this.usersService.findByEmail(email);
    if (!user) {
      await this.logAudit(null, 'BIOMETRIC_LOGIN_FAILED', 'User', null, null, { email, reason: 'User not found' });
      throw new UnauthorizedException('Biometric authentication failed: User not registered');
    }

    // Check if user account is active
    if (!user.isActive) {
      await this.logAudit(user.id, 'BIOMETRIC_LOGIN_BLOCKED', 'User', user.id, null, { reason: 'Account deactivated' });
      throw new ForbiddenException('Account has been deactivated. Contact your administrator.');
    }

    // Check if user is suspended/terminated/blacklisted
    if (['SUSPENDED', 'TERMINATED', 'BLACKLISTED'].includes(user.state)) {
      await this.logAudit(user.id, 'BIOMETRIC_LOGIN_BLOCKED', 'User', user.id, null, { reason: `Account state: ${user.state}` });
      throw new ForbiddenException(`Account is ${user.state.toLowerCase()}. Contact your administrator.`);
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    // Audit successful biometric login
    await this.logAudit(user.id, 'BIOMETRIC_LOGIN_SUCCESS', 'User', user.id, null, { method: 'biometric' });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        state: user.state,
        mustChangePassword: user.mustChangePassword,
        biometricEnrolled: !!user.faceEmbedding || !!user.fingerprintTemplate,
        faceEnrolled: !!user.faceEmbedding,
        fingerprintEnrolled: !!user.fingerprintTemplate,
        faceEmbedding: user.faceEmbedding,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // 1. Prevent duplicate usernames/email IDs
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    // 2. Validate password strength before account creation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(registerDto.password)) {
      throw new BadRequestException('Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number.');
    }

    // 3. A user cannot complete registration without at least one biometric: Face OR Fingerprint
    if (!registerDto.faceEmbedding && !registerDto.fingerprintTemplate) {
      throw new BadRequestException('At least one biometric (Face or Fingerprint) is required to complete registration.');
    }

    // 4. Prevent duplicate biometric registrations across multiple accounts
    if (registerDto.faceEmbedding) {
      if (registerDto.faceEmbedding.length !== 128) {
        throw new BadRequestException('Embedding must be exactly 128 dimensions.');
      }
      const vectorString = `[${registerDto.faceEmbedding.join(',')}]`;
      const duplicateFace: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT id, 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
        FROM "User"
        WHERE "faceEmbedding" IS NOT NULL
        ORDER BY "faceEmbedding"::vector <=> $1::vector
        LIMIT 1;
      `, vectorString);

      if (duplicateFace.length > 0 && duplicateFace[0].confidence > 0.90) {
        throw new BadRequestException('This Face biometric data is already registered to another user.');
      }
    }

    let encryptedFingerprint: string | null = null;
    if (registerDto.fingerprintTemplate) {
      encryptedFingerprint = encrypt(registerDto.fingerprintTemplate.trim());
      const duplicateFingerprint = await this.prisma.user.findFirst({
        where: { fingerprintTemplate: encryptedFingerprint }
      });
      if (duplicateFingerprint) {
        throw new BadRequestException('This Fingerprint biometric data is already registered to another user.');
      }
    }

    // 5. Create user and map to Vendor
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: registerDto.role,
      vendor: registerDto.vendorId ? { connect: { id: registerDto.vendorId } } : undefined,
    });

    // 6. Store biometrics securely
    if (encryptedFingerprint) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { fingerprintTemplate: encryptedFingerprint }
      });
    }

    if (registerDto.faceEmbedding) {
      const vectorString = `[${registerDto.faceEmbedding.join(',')}]`;
      await this.prisma.$executeRawUnsafe(
        `UPDATE "User" SET "faceEmbedding" = $1::vector WHERE id = $2`, 
        vectorString, 
        user.id
      );
    }

    const { password, ...result } = user;

    // Audit registration
    await this.logAudit(user.id, 'USER_REGISTERED', 'User', user.id, null, { email: user.email, role: user.role });

    return result;
  }

  /**
   * Validate credentials without requiring biometric — used only during
   * the biometric enrollment flow so the frontend can get a JWT to call
   * POST /biometrics/enroll.
   */
  async enrollmentLogin(email: string, password: string) {
    const user: any = await this.validateUser(email, password);
    if (!user) {
      await this.logAudit(null, 'ENROLLMENT_LOGIN_FAILED', 'User', null, null, { email, reason: 'Invalid credentials' });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account has been deactivated. Contact your administrator.');
    }

    if (['SUSPENDED', 'TERMINATED', 'BLACKLISTED'].includes(user.state)) {
      throw new ForbiddenException(`Account is ${user.state.toLowerCase()}. Contact your administrator.`);
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    await this.logAudit(user.id, 'ENROLLMENT_LOGIN', 'User', user.id, null, { method: 'enrollment-credentials' });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        biometricEnrolled: !!user.faceEmbedding || !!user.fingerprintTemplate,
        faceEnrolled: !!user.faceEmbedding,
        fingerprintEnrolled: !!user.fingerprintTemplate,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isOldPassValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPassValid) {
      await this.logAudit(userId, 'PASSWORD_CHANGE_FAILED', 'User', userId, null, { reason: 'Invalid current password' });
      throw new UnauthorizedException('Invalid current password');
    }

    // Prevent setting the same password
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password cannot be the same as the current password');
    }

    // Hash and update new password
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(userId, hashedNewPassword);

    // Audit successful password change
    await this.logAudit(userId, 'PASSWORD_CHANGED', 'User', userId,
      { mustChangePassword: user.mustChangePassword },
      { mustChangePassword: false }
    );

    return { success: true, message: 'Password updated successfully' };
  }

  /**
   * Write an entry to the AuditLog table for security-sensitive actions.
   */
  private async logAudit(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValue: any,
    newValue: any,
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
        },
      });
    } catch (err) {
      // Audit logging should never break primary auth flows
      console.error('[AuditLog] Failed to write audit entry:', err);
    }
  }
}
