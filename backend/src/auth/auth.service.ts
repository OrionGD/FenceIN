import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, ChangePasswordDto } from './auth.dto';
import { PrismaService } from '../prisma/prisma.service';

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
        biometricEnrolled: user.faceEmbedding !== null && user.faceEmbedding !== undefined,
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
        biometricEnrolled: user.faceEmbedding !== null && user.faceEmbedding !== undefined,
        faceEmbedding: user.faceEmbedding,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });
    const { password, ...result } = user;

    // Audit registration
    await this.logAudit(user.id, 'USER_REGISTERED', 'User', user.id, null, { email: user.email, role: user.role });

    return result;
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
