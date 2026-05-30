import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsNumber()
  @IsOptional()
  gracePeriodMin?: number;

  @IsBoolean()
  @IsOptional()
  isOvernight?: boolean;

  @IsString()
  @IsOptional()
  tenantId?: string;
}
