import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum BillingCheckoutProviderDto {
  SANDBOX = 'SANDBOX',
}

export class CreateCheckoutDto {
  @IsUUID()
  @IsNotEmpty()
  packageId!: string;

  @IsUUID()
  @IsNotEmpty()
  packagePriceId!: string;

  @IsOptional()
  @IsString()
  discountCode?: string;

  @IsOptional()
  @IsEnum(BillingCheckoutProviderDto)
  provider?: BillingCheckoutProviderDto;
}
