import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePriceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  amountMinor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
