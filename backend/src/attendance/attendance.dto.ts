import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CheckInDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsNumber() accuracy?: number;

  // Enterprise Fields
  @IsOptional() @IsNumber() livenessScore?: number;
  @IsOptional() @IsNumber() deviceTrustScore?: number;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsString() kioskId?: string;
}
