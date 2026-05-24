import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateSiteDto {
  @IsString() name!: string;
  @IsNumber() latitude!: number;
  @IsNumber() longitude!: number;
  @IsOptional() @IsNumber() radius?: number;
}

export class AssignWorkerDto {
  @IsString() workerId!: string;
  @IsString() siteId!: string;
}
