import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class SetPackageFeatureDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  limitValue?: number;
}
