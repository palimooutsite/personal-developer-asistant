import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BillingFeatureValueTypeDto } from './create-feature.dto.js';

export class UpdateFeatureDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(BillingFeatureValueTypeDto)
  valueType?: BillingFeatureValueTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
