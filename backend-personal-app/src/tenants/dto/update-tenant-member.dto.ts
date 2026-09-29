import { IsUUID } from 'class-validator';

export class UpdateTenantMemberDto {
  @IsUUID()
  roleId!: string;
}
