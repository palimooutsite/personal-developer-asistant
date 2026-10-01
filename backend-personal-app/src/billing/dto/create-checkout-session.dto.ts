import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export enum BillingCheckoutSessionProviderDto {
  SANDBOX = 'SANDBOX',
}

export class CreateCheckoutSessionDto {
  @IsUUID()
  @IsNotEmpty()
  packageId!: string;

  @IsUUID()
  @IsNotEmpty()
  packagePriceId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  workspaceName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountCode?: string;

  @IsOptional()
  @IsEnum(BillingCheckoutSessionProviderDto)
  provider?: BillingCheckoutSessionProviderDto;
}
