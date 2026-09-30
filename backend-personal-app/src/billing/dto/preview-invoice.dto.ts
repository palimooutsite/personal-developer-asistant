import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewInvoiceDto {
  @IsOptional()
  @IsString()
  discountCode?: string;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  discountCode?: string;
}
