import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, ChangePasswordDto, RegisterOrganizationDto } from './auth.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MongoService } from '../mongo/mongo.service';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'fencein-secure-biometrics-fallback-key', 'salt', 32);
const IV = Buffer.alloc(16, 0);

const ROLE_TO_LEVEL: Record<string, number> = {
  ORGANIZATION: 0,
  SUPER_ADMIN: 1,
  ORG_ADMIN: 2,
  HR_ADMIN: 2,
  SUPERVISOR: 3,
  SECURITY_OFFICER: 4,
  VENDOR_MANAGER: 5,
  VENDOR: 5,
  WORKER: 6,
};

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

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
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mongo: MongoService,
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
      await this.logAudit(null, 'LOGIN_FAILED', 'User', null, null, { email: loginDto.email, reason: 'Invalid credentials' });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.logAudit(user.id, 'LOGIN_BLOCKED', 'User', user.id, null, { reason: 'Account deactivated' });
      throw new ForbiddenException('Account has been deactivated. Contact your administrator.');
    }

    if (['SUSPENDED', 'TERMINATED', 'BLACKLISTED'].includes(user.state)) {
      await this.logAudit(user.id, 'LOGIN_BLOCKED', 'User', user.id, null, { reason: `Account state: ${user.state}` });
      throw new ForbiddenException(`Account is ${user.state.toLowerCase()}. Contact your administrator.`);
    }

    const userRoleValue = user.userRole || user.role;
    const payload = { 
      email: user.email, 
      sub: user.id, 
      userId: user.user_id,
      role: userRoleValue, 
      roleLevel: user.roleLevel,
      tenantId: user.tenantId || null, 
      organizationId: user.tenantId || null, 
      type: 'authenticated' 
    };

    await this.logAudit(user.id, 'CREDENTIALS_VALIDATION_SUCCESS', 'User', user.id, null, { email: user.email });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRoleValue,
        state: user.state,
        mustChangePassword: user.mustChangePassword,
        biometricEnrolled: user.faceRegistered || user.fingerprintRegistered,
        faceEnrolled: user.faceRegistered,
        fingerprintEnrolled: user.fingerprintRegistered,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(registerDto.password)) {
      throw new BadRequestException('Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number.');
    }

    if (!registerDto.faceImage && !registerDto.fingerprintImage) {
      throw new BadRequestException('At least one biometric (Face or Fingerprint) is required to complete registration.');
    }

    // Resolve tenant details first to enforce proper biometric isolation boundaries
    let resolvedTenantId = 'ORG001';
    let resolvedTenantName = 'SHIELD';
    if (registerDto.vendorId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: registerDto.vendorId },
        select: { tenantId: true }
      });
      if (vendor && vendor.tenantId) {
        resolvedTenantId = vendor.tenantId;
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: vendor.tenantId },
          select: { name: true }
        });
        if (tenant) {
          resolvedTenantName = tenant.name;
        }
      }
    }

    let resolvedEmbedding: number[] | null = null;
    if (registerDto.faceImage) {
      console.log(`[Auth] Delegating face embedding extraction to Python Engine...`);
      const pythonRes = await callPythonBiometrics('/face/embed', { image: registerDto.faceImage });
      if (!pythonRes || !pythonRes.success || !pythonRes.embedding) {
        throw new BadRequestException('Face biometric registration failed: Face undetected, passive liveness rejected, or server offline.');
      }
      const resolved = pythonRes.embedding;
      resolvedEmbedding = resolved;
      console.log(`[Auth] Face embedding successfully extracted from Python. Liveness Score: ${pythonRes.liveness_score}`);
      
      const vectorString = `[${resolved.join(',')}]`;
      // BIOMETRIC SECURITY RULE: Face duplicate checks must ONLY search within the target tenant context
      const duplicateFace: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT id, 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
        FROM users
        WHERE "faceEmbedding" IS NOT NULL AND "tenantId" = $2
        ORDER BY "faceEmbedding"::vector <=> $1::vector
        LIMIT 1;
      `, vectorString, resolvedTenantId);

      if (duplicateFace.length > 0 && duplicateFace[0].confidence >= 0.72) {
        console.log(`[BIOMETRIC DUPLICATE DETECTED]\nmatched_user_id=${duplicateFace[0].id}\nsimilarity=${Number(duplicateFace[0].confidence).toFixed(4)}\nregistration_blocked=true`);
        throw new BadRequestException('Face already registered to another account.');
      }
    }

    let encryptedFingerprint: string | null = null;
    if (registerDto.fingerprintImage) {
      console.log(`[Auth] Extracting fingerprint template via Python CV engine...`);
      const pythonRes = await callPythonBiometrics('/fingerprint/extract', { image: registerDto.fingerprintImage });
      if (!pythonRes || !pythonRes.success || !pythonRes.serialized_template) {
        throw new BadRequestException('Fingerprint registration failed: Low print contrast, scanner noise, or engine offline.');
      }
      
      encryptedFingerprint = encrypt(pythonRes.serialized_template.trim());
      // BIOMETRIC SECURITY RULE: Fingerprint duplicate checks must ONLY search within the target tenant context
      const duplicateFingerprint = await this.prisma.user.findFirst({
        where: { 
          fingerprintTemplate: encryptedFingerprint,
          tenantId: resolvedTenantId
        }
      });
      if (duplicateFingerprint) {
        throw new BadRequestException('This Fingerprint biometric data is already registered to another user.');
      }
    }

    const userRoleStr = registerDto.role || 'WORKER';
    const roleLevelNum = ROLE_TO_LEVEL[userRoleStr] ?? 6;
    const customUserId = `USR_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      userRole: userRoleStr,
      roleLevel: roleLevelNum,
      user_id: customUserId,
      tenantId: resolvedTenantId,
      tenantName: resolvedTenantName,
      state: 'ACTIVE',
      faceRegistered: !!resolvedEmbedding,
      fingerprintRegistered: !!encryptedFingerprint,
      vendor: registerDto.vendorId ? { connect: { id: registerDto.vendorId } } : undefined,
    });

    if (encryptedFingerprint) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { fingerprintTemplate: encryptedFingerprint }
      });
    }

    if (resolvedEmbedding) {
      const vectorString = `[${resolvedEmbedding.join(',')}]`;
      await this.prisma.$executeRawUnsafe(
        `UPDATE users SET "faceEmbedding" = $1::vector WHERE id = $2`, 
        vectorString, 
        user.id
      );
    }

    const { password, ...result } = user;

    await this.logAudit(user.id, 'USER_REGISTERED', 'User', user.id, null, { email: user.email, role: userRoleStr });

    return result;
  }

  async registerOrganization(dto: RegisterOrganizationDto) {
    if (dto.adminPassword !== dto.adminConfirmPassword) {
      throw new BadRequestException('Password and Confirm Password do not match.');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(dto.adminPassword)) {
      throw new BadRequestException('Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number.');
    }

    // Check if admin email already exists
    const existingUser = await this.usersService.findByEmail(dto.adminEmail);
    if (existingUser) {
      throw new BadRequestException('A user with this admin email already exists.');
    }

    let resolvedEmbedding: number[] | null = null;
    let vectorString: string | null = null;
    if (dto.faceImage) {
      console.log(`[Auth] Delegating admin face embedding extraction to Python Engine...`);
      const pythonRes = await callPythonBiometrics('/face/embed', { image: dto.faceImage });
      if (!pythonRes || !pythonRes.success || !pythonRes.embedding) {
        throw new BadRequestException('Face biometric registration failed: Face undetected, passive liveness rejected, or server offline.');
      }
      resolvedEmbedding = pythonRes.embedding;
      vectorString = `[${resolvedEmbedding!.join(',')}]`;
      console.log(`[Auth] Admin face embedding successfully extracted from Python. Liveness Score: ${pythonRes.liveness_score}`);
    } else {
      throw new BadRequestException('Face registration is mandatory for SUPER_ADMIN onboarding.');
    }

    // Execute in a transaction to guarantee atomic sequential ID generation
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Generate Organization ID (format OG001, OG002, ...)
      const lastTenant = await tx.tenant.findFirst({
        where: { organizationCode: { startsWith: 'OG' } },
        orderBy: { organizationCode: 'desc' },
      });
      let nextOrgNum = 1;
      if (lastTenant && lastTenant.organizationCode) {
        const match = lastTenant.organizationCode.match(/^OG(\d+)$/);
        if (match) {
          nextOrgNum = parseInt(match[1], 10) + 1;
        }
      }
      const organizationCode = `OG${String(nextOrgNum).padStart(3, '0')}`;

      // Slug generation
      const slug = dto.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existingSlug = await tx.tenant.findUnique({ where: { slug } });
      const finalSlug = existingSlug ? `${slug}-${crypto.randomBytes(3).toString('hex')}` : slug;

      // Create Tenant
      const newTenant = await tx.tenant.create({
        data: {
          name: dto.orgName,
          slug: finalSlug,
          plan: 'STANDARD',
          organizationCode,
          organizationType: dto.orgType,
          companyEmail: dto.companyEmail,
          companyPhone: dto.companyPhone,
          companyAddress: dto.companyAddress,
          expectedUserCount: dto.expectedUserCount,
        },
      });

      // 2. Generate Super Admin ID (format SA001, SA002, ...)
      const lastSuperAdmin = await tx.user.findFirst({
        where: { userRole: 'SUPER_ADMIN', user_id: { startsWith: 'SA' } },
        orderBy: { user_id: 'desc' },
      });
      let nextSAId = 1;
      if (lastSuperAdmin && lastSuperAdmin.user_id) {
        const match = lastSuperAdmin.user_id.match(/^SA(\d+)$/);
        if (match) {
          nextSAId = parseInt(match[1], 10) + 1;
        }
      }
      const user_id = `SA${String(nextSAId).padStart(3, '0')}`;

      // 3. Create Super Admin User
      const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
      const newAdmin = await tx.user.create({
        data: {
          user_id,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          email: dto.adminEmail,
          password: hashedPassword,
          tenantId: newTenant.id,
          tenantName: newTenant.name,
          userRole: 'SUPER_ADMIN',
          roleLevel: 1,
          state: 'ACTIVE',
          faceRegistered: true,
          mustChangePassword: false,
          isActive: true,
        },
      });

      // 4. Update the user's faceEmbedding using queryRaw because vector is Unsupported
      if (vectorString) {
        await tx.$executeRawUnsafe(`
          UPDATE users
          SET "faceEmbedding" = $1::vector
          WHERE id = $2
        `, vectorString, newAdmin.id);
      }

      return {
        tenant: newTenant,
        admin: newAdmin,
      };
    });

    await this.logAudit(result.admin.id, 'ORGANIZATION_REGISTER_SUCCESS', 'Tenant', result.tenant.id, null, {
      orgCode: result.tenant.organizationCode,
      adminId: result.admin.user_id,
    });

    return {
      success: true,
      message: 'Organization and Super Admin successfully registered.',
      data: {
        organizationId: result.tenant.organizationCode,
        superAdminId: result.admin.user_id,
        tenantId: result.tenant.id,
        tenantName: result.tenant.name,
      },
    };
  }

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

    const userRoleValue = user.userRole || user.role;
    const payload = { email: user.email, sub: user.id, role: userRoleValue, tenantId: user.tenantId || null, organizationId: user.tenantId || null };

    await this.logAudit(user.id, 'ENROLLMENT_LOGIN', 'User', user.id, null, { method: 'enrollment-credentials' });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRoleValue,
        mustChangePassword: user.mustChangePassword,
        biometricEnrolled: user.faceRegistered || user.fingerprintRegistered,
        faceEnrolled: user.faceRegistered,
        fingerprintEnrolled: user.fingerprintRegistered,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isOldPassValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPassValid) {
      await this.logAudit(userId, 'PASSWORD_CHANGE_FAILED', 'User', userId, null, { reason: 'Invalid current password' });
      throw new UnauthorizedException('Invalid current password');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password cannot be the same as the current password');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(userId, hashedNewPassword);

    await this.logAudit(userId, 'PASSWORD_CHANGED', 'User', userId,
      { mustChangePassword: user.mustChangePassword },
      { mustChangePassword: false }
    );

    return { success: true, message: 'Password updated successfully' };
  }

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
    // AuditLog lives in MongoDB (migrated from PostgreSQL).
    // Do NOT use this.prisma.auditLog — that model no longer exists in schema.prisma.
    let tenantId: string | null = null;
    if (userId) {
      try {
        const dbUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
        tenantId = dbUser?.tenantId || null;
      } catch (err) {
        console.warn('[AuthService] Failed to resolve tenantId for audit log:', err);
      }
    }
    await this.mongo.logAudit({
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
      ipAddress,
      device,
    });
  }
}
