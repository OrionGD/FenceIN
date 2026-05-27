import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class EnrollFaceDto {
  @IsString()
  userId!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  embedding?: number[];

  @IsString()
  @IsOptional()
  image?: string;
}

export class MatchFaceDto {
  @IsString()
  email!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  embedding?: number[];

  @IsString()
  @IsOptional()
  image?: string;
}

export class VerifyFaceDto {
  @IsString()
  userId!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  embedding?: number[];

  @IsString()
  @IsOptional()
  image?: string;
}

export class EnrollFingerprintDto {
  @IsString()
  userId!: string;

  @IsString()
  fingerprintTemplate!: string;

  @IsString()
  @IsOptional()
  image?: string;
}

export class VerifyFingerprintDto {
  @IsString()
  userId!: string;

  @IsString()
  fingerprintTemplate!: string;

  @IsString()
  @IsOptional()
  image?: string;
}
