import { IsEmail, IsIn } from 'class-validator';

export class CreateTenantInvitationDto {
  @IsEmail()
  email!: string;

  @IsIn(['ADMIN', 'MEMBER'])
  role!: 'ADMIN' | 'MEMBER';
}
