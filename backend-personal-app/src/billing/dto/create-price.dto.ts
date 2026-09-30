import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum BillingPeriodDto {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreatePriceDto {
  @IsEnum(BillingPeriodDto)
  billingPeriod!: BillingPeriodDto;

  @IsInt()
  @Min(0)
  amountMinor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}
