import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsString()
  @IsNotEmpty()
  managerId!: string;
}
