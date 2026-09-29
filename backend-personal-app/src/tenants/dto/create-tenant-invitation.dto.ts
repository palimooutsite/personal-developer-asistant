import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateTenantInvitationDto {
  @IsEmail()
  email!: string;

  @IsUUID()
  @IsNotEmpty()
  roleId!: string;
}
