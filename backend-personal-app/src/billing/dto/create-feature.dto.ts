import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum BillingFeatureValueTypeDto {
  BOOLEAN = 'BOOLEAN',
  LIMIT = 'LIMIT',
}

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(BillingFeatureValueTypeDto)
  valueType!: BillingFeatureValueTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;
}
