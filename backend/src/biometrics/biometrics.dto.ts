import { IsArray, IsNumber, IsString } from 'class-validator';

export class EnrollFaceDto {
  @IsString()
  userId!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  embedding!: number[];
}

export class MatchFaceDto {
  @IsString()
  email!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  embedding!: number[];
}

export class VerifyFaceDto {
  @IsString()
  userId!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  embedding!: number[];
}

export class EnrollFingerprintDto {
  @IsString()
  userId!: string;

  @IsString()
  fingerprintTemplate!: string;
}

export class VerifyFingerprintDto {
  @IsString()
  userId!: string;

  @IsString()
  fingerprintTemplate!: string;
}

