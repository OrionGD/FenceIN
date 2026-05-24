import { IsArray, IsNumber, IsString } from 'class-validator';

export class EnrollFaceDto {
  @IsString()
  userId!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  embedding!: number[];
}

export class MatchFaceDto {
  @IsArray()
  @IsNumber({}, { each: true })
  embedding!: number[];
}
