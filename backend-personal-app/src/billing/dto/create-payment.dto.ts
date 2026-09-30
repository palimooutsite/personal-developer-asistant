import { IsEnum, IsNotEmpty } from 'class-validator';

export enum BillingPaymentProviderDto {
  SANDBOX = 'SANDBOX',
  MIDTRANS = 'MIDTRANS',
  XENDIT = 'XENDIT',
}

export class CreatePaymentDto {
  @IsEnum(BillingPaymentProviderDto)
  @IsNotEmpty()
  provider!: BillingPaymentProviderDto;
}
