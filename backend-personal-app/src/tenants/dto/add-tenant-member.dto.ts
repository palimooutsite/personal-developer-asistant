import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class AddTenantMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  @IsOptional()
  roleId?: string;
}
