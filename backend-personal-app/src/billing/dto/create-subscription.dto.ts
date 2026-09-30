import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum BillingSubscriptionProviderDto {
  SANDBOX = 'SANDBOX',
  MIDTRANS = 'MIDTRANS',
  XENDIT = 'XENDIT',
}

export class CreateSubscriptionDto {
  @IsUUID()
  @IsNotEmpty()
  packageId!: string;

  @IsUUID()
  @IsNotEmpty()
  packagePriceId!: string;

  @IsOptional()
  @IsEnum(BillingSubscriptionProviderDto)
  provider?: BillingSubscriptionProviderDto;
}
