import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class CreateTenantInvitationDto {
  @IsEmail()
  email!: string;

  @IsUUID()
  @IsOptional()
  roleId?: string;
}
