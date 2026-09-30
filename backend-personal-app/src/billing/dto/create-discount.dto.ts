import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum BillingDiscountTypeDto {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum BillingDiscountDurationDto {
  ONCE = 'ONCE',
  RECURRING_CYCLES = 'RECURRING_CYCLES',
  FOREVER = 'FOREVER',
}

export class CreateDiscountDto {
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

  @IsEnum(BillingDiscountTypeDto)
  type!: BillingDiscountTypeDto;

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
}
