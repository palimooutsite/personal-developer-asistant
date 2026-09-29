import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddTenantMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  @IsNotEmpty()
  roleId!: string;
}
