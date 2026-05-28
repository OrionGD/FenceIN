import { IsString } from 'class-validator';

export class EnrollFaceDto {
  @IsString()
  userId!: string;

  @IsString()
  image!: string;
}

export class MatchFaceDto {
  @IsString()
  email!: string;

  @IsString()
  image!: string;
}

export class VerifyFaceDto {
  @IsString()
  userId!: string;

  @IsString()
  image!: string;
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

  @IsString()
  tenantId!: string;
}

export class IdentifyByFingerprintDto {
  @IsString()
  image!: string;

  @IsString()
  tenantId!: string;
}

