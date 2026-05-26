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
  @IsArray()
  @IsNumber({}, { each: true })
  faceEmbedding?: number[];

  @IsOptional()
  @IsString()
  fingerprintTemplate?: string;

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
