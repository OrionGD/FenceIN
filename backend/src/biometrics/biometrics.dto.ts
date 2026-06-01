import { IsString, IsArray, IsNumber, IsOptional } from 'class-validator';

export class EnrollFaceDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  embedding?: number[];
}

export class MatchFaceDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  embedding?: number[];
}

export class VerifyFaceDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  embedding?: number[];
}

export class EnrollFingerprintDto {
  @IsString()
  userId!: string;

  @IsString()
  image!: string;
}

export class VerifyFingerprintDto {
  @IsString()
  userId!: string;

  @IsString()
  image!: string;
}

/**
 * Independent 1:N identification DTOs.
 * No userId, email, or password required —
 * the backend identifies "who is this biometric?" from the full enrolled set.
 */
export class IdentifyByFaceDto {
  @IsString()
  image!: string;
}

export class IdentifyByFingerprintDto {
  @IsString()
  image!: string;
}

