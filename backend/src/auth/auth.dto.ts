import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';
import { Role } from '@prisma/client';

export class LoginDto {
  @IsString()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @IsString()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsOptional()
  @IsString()
  faceImage?: string;

  @IsOptional()
  @IsString()
  fingerprintImage?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  oldPassword!: string;

  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  newPassword!: string;
}

export class RegisterOrganizationDto {
  @IsString()
  orgName!: string;

  @IsString()
  orgType!: string;

  @IsEmail()
  companyEmail!: string;

  @IsString()
  companyPhone!: string;

  @IsString()
  companyAddress!: string;

  @IsNumber()
  expectedUserCount!: number;

  @IsString()
  adminFirstName!: string;

  @IsString()
  adminLastName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(6)
  adminPassword!: string;

  @IsString()
  @MinLength(6)
  adminConfirmPassword!: string;

  @IsString()
  @IsOptional()
  faceImage?: string;
}
