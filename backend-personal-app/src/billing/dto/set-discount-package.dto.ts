import { IsBoolean } from 'class-validator';

export class SetDiscountPackageDto {
  @IsBoolean()
  enabled!: boolean;
}
