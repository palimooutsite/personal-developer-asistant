import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BillingDiscountDurationDto,
  BillingDiscountTypeDto,
} from './create-discount.dto.js';

export class UpdateDiscountDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(BillingDiscountTypeDto)
  type?: BillingDiscountTypeDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  valueMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscountMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumAmountMinor?: number;

  @IsOptional()
  @IsEnum(BillingDiscountDurationDto)
  duration?: BillingDiscountDurationDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationCycles?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
